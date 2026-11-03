-- =========================================================
-- Passage Monitor - 관리자 목록 + 재생 현황 조회 함수 (TASK-002, D-003)
--
-- Passage 저장소의 playback_logs.sql 다음에 SQL Editor에서 통째로
-- 실행하세요. 여러 번 실행해도 안전합니다.
--
-- 이 스크립트가 하는 일:
--   1) monitor_admins: 대시보드 관리자 계정(user_id)만 담는 표.
--      앱 역할(anon·authenticated)은 읽지도 쓰지도 못한다. 추가·삭제는
--      SQL Editor에서만 한다(맨 아래 "관리자 추가" 참고).
--   2) is_monitor_admin(): 로그인한 계정이 관리자이면 true. monitor_* 함수 안에서만 쓴다 (직접 호출 불가).
--   3) monitor_playback_facts(): 관리자만 부를 수 있는 재생 현황 조회.
--      playback_session_facts()를 감싸, 셀지 뺄지 판단에 필요한 칸만
--      돌려준다. 가명 청취자 ID·방문 ID 등 나머지 칸은 넘기지 않는다.
--      셀지 뺄지 규칙은 적용하지 않는다(대시보드 src/lib/playback.ts 가 한다).
--
-- 기존 Passage 테이블·함수·정책은 바꾸지 않는다. service role key 없이
-- anon key + 관리자 로그인 세션으로만 부른다.
-- =========================================================

begin;



-- =========================================================
-- 1. 관리자 목록
-- =========================================================

create table if not exists public.monitor_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.monitor_admins enable row level security;

-- 정책을 만들지 않는다 → RLS 로 모든 행이 막힌다. 권한도 걷어 낸다.
revoke all on public.monitor_admins from public, anon, authenticated;



-- =========================================================
-- 2. 관리자 여부
-- =========================================================

create or replace function public.is_monitor_admin()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.monitor_admins a
    where a.user_id = (select auth.uid())
  );
$function$;

-- 직접 호출은 막는다 (콘솔에서 관리자인지 알아낼 수 없게).
-- monitor_* 함수는 security definer 라 소유자 권한으로 이 함수를 부른다.
revoke all
on function public.is_monitor_admin()
from public, anon, authenticated;



-- =========================================================
-- 3. 재생 현황 조회 (관리자 전용)
-- =========================================================
--
-- 기간은 필수, 최대 93일. [p_from, p_to) 사이에 시작한 재생만.
-- 곡 이름은 현재 곡 목록(songs)을 우선하고, 없으면 재생을 받을 때의 이름.
-- 곡이 연결되지 않은 재생은 song_id 가 null 이다.
-- 관리자가 아니면 42501(insufficient_privilege) 오류를 낸다.
-- =========================================================

create or replace function public.monitor_playback_facts(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  playback_id uuid,
  post_id uuid,
  song_id uuid,
  song_title text,
  artist text,
  is_own boolean,
  source text,
  started_at timestamptz,
  prev_relation text,
  gap_start_to_start_ms bigint,
  gap_end_to_start_ms bigint
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
begin
  if not public.is_monitor_admin() then
    raise exception 'monitor admin only'
      using errcode = '42501';
  end if;

  if p_from is null or p_to is null or p_to <= p_from then
    raise exception 'p_from and p_to are required (p_from < p_to)'
      using errcode = '22023';
  end if;

  if p_to - p_from > interval '93 days' then
    raise exception 'period must be 93 days or less'
      using errcode = '22023';
  end if;

  return query
  select
    f.playback_id,
    f.post_id,
    f.song_key_for_count,
    coalesce(s.title, f.song_title_at_receipt),
    coalesce(s.artist, f.artist_at_receipt),
    f.is_own,
    f.source,
    f.started_at,
    f.prev_relation,
    f.gap_start_to_start_ms,
    f.gap_end_to_start_ms
  from public.playback_session_facts(p_from, p_to) f
  left join public.songs s
    on s.song_id = f.song_key_for_count
  order by f.started_at, f.playback_id;
end;
$function$;

revoke all
on function public.monitor_playback_facts(timestamptz, timestamptz)
from public, anon;

grant execute
on function public.monitor_playback_facts(timestamptz, timestamptz)
to authenticated;

commit;

-- 새 테이블·함수를 API가 바로 인식하도록 스키마 캐시를 다시 읽게 한다.
notify pgrst, 'reload schema';



-- =========================================================
-- 관리자 추가 (SQL Editor에서, 필요할 때만)
-- =========================================================
-- 1) Supabase 대시보드 > Authentication > Users > Add user 로 관리자 계정을 만든다.
--    대시보드는 아이디로 로그인한다: 아이디 admin1 → 이메일 칸에 admin1@passage.invalid
--    (도메인은 대시보드 .env.local 의 NEXT_PUBLIC_ADMIN_ID_DOMAIN 과 같아야 한다.
--     실제 메일함이 아니므로 "Auto Confirm User" 를 켜서 만든다.)
--    (가입 트리거가 profiles 에 'pending' 행을 만든다 → 앱 커뮤니티에는 못 들어간다)
-- 2) 아래 이메일 자리를 바꿔 실행한다.
--   insert into public.monitor_admins (user_id)
--   select id from auth.users where lower(email) = lower('<아이디>@passage.invalid')
--   on conflict (user_id) do nothing;
--
-- 관리자 빼기:
--   delete from public.monitor_admins
--   where user_id = (select id from auth.users where lower(email) = lower('<아이디>@passage.invalid'));



-- =========================================================
-- 적용 후 확인 (데이터를 바꾸지 않는 조회만, SQL Editor에서)
-- =========================================================
-- 1) 앱 역할 권한: 표는 모두 false, 함수 실행은 authenticated 만 true 여야 한다.
--   select r.role,
--          has_table_privilege(r.role, 'public.monitor_admins', 'select') as admins_select,
--          has_function_privilege(r.role, 'public.monitor_playback_facts(timestamptz, timestamptz)', 'execute') as facts_execute
--   from (values ('anon'), ('authenticated')) as r(role);
-- 2) 관리자 목록
--   select a.user_id, a.created_at from public.monitor_admins a;
-- 3) SQL Editor 에서는 auth.uid() 가 없어 monitor_playback_facts() 가 42501 로
--    거부되는 것이 정상이다. 실제 조회는 대시보드에서 관리자로 로그인해 확인한다.

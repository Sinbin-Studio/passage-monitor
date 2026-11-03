-- =========================================================
-- Passage Monitor - 베타테스트 미션 현황 조회 함수 (TASK-003)
--
-- monitor_playback_admin.sql(관리자 목록 · is_monitor_admin) 다음에
-- SQL Editor 에서 통째로 실행하세요. 여러 번 실행해도 안전합니다.
--
-- monitor_mission_status(p_since): 관리자만 부를 수 있다.
--   베타테스터(profiles.role = user · skilled · expert)마다 미션 실적 개수를 돌려준다.
--   목표 · 진행률 · 완료 판정은 대시보드 src/lib/missions.ts 가 한다.
--
-- 세는 기준 (사용자 SQL beta_mission_check.sql, 2026-10-31 과 같다)
--   최초 녹음   = 본인 글 중 is_repractice = false
--   재연습      = 본인 글 중 is_repractice = true (같은 곡 두 번째 이상 글)
--   코멘트      = 남의 글에 단 피드백(comments). 본인 글에 단 것은 세지 않는다.
--                 대상 글의 is_repractice 로 일반 글 / 재연습 글을 나눈다.
--                 글 단위로 센다(한 글에 여러 개를 달아도 1개).
--   계정        = Google 연동이면 Google 메일, Apple 연동이면 'apple'
--                 (둘 다 연동돼 있으면 Google 메일).
--   지워진 글 · 피드백은 DB 에 남지 않아 세지 않는다.
--   운영자 · 테스트 계정은 monitor_excluded_accounts 표에 넣어 뺀다 (메일을 코드에 두지 않는다).
--   p_since 가 null 이면 전체 기간, 값을 넣으면 그 시각 이후만 센다.
--
-- 기존 Passage 테이블 · 함수 · 정책은 바꾸지 않는다.
-- =========================================================

begin;



-- =========================================================
-- 1. 집계에서 뺄 계정 (운영자 · 테스트 계정)
-- =========================================================
-- 계정 넣기 · 빼기는 이 파일 맨 아래 주석 참고.

create table if not exists public.monitor_excluded_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

alter table public.monitor_excluded_accounts enable row level security;

-- 정책을 만들지 않는다 → RLS 로 모든 행이 막힌다. 권한도 걷어 낸다.
revoke all on public.monitor_excluded_accounts from public, anon, authenticated;



-- =========================================================
-- 2. 미션 현황 (관리자 전용)
-- =========================================================

create or replace function public.monitor_mission_status(
  p_since timestamptz default null
)
returns table (
  role text,
  username text,
  account text,
  first_cnt integer,
  comment_cnt integer,
  re_cnt integer,
  re_comment_cnt integer
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
#variable_conflict use_column
begin
  if not public.is_monitor_admin() then
    raise exception 'monitor admin only'
      using errcode = '42501';
  end if;

  return query
  with testers as (
    select p.user_id, p.username, p.role,
           coalesce(
             (select coalesce(i.identity_data->>'email', u.email)
              from auth.identities i
              where i.user_id = u.id and i.provider = 'google'
              limit 1),
             (select 'apple'
              from auth.identities i
              where i.user_id = u.id and i.provider = 'apple'
              limit 1),
             u.email
           ) as account
    from public.profiles p
    join auth.users u on u.id = p.user_id
    where p.role in ('user', 'skilled', 'expert')
      and not exists (select 1 from public.monitor_excluded_accounts x where x.user_id = u.id)
  ),
  post_kind as (
    select po.post_id, po.user_id, po.created_at,
           public.is_repractice(po) as is_re
    from public.posts po
  ),
  uploads as (
    select pk.user_id,
           count(*) filter (where not pk.is_re) as first_cnt,
           count(*) filter (where pk.is_re)     as re_cnt
    from post_kind pk
    where p_since is null or pk.created_at >= p_since
    group by pk.user_id
  ),
  feedbacks as (
    select c.user_id,
           count(distinct c.post_id) filter (where not pk.is_re) as comment_cnt,
           count(distinct c.post_id) filter (where pk.is_re)     as re_comment_cnt
    from public.comments c
    join post_kind pk on pk.post_id = c.post_id
    where pk.user_id <> c.user_id
      and (p_since is null or c.created_at >= p_since)
    group by c.user_id
  )
  select t.role::text,
         t.username::text,
         t.account::text,
         coalesce(up.first_cnt, 0)::integer,
         coalesce(f.comment_cnt, 0)::integer,
         coalesce(up.re_cnt, 0)::integer,
         coalesce(f.re_comment_cnt, 0)::integer
  from testers t
  left join uploads up on up.user_id = t.user_id
  left join feedbacks f on f.user_id = t.user_id;
end;
$function$;

revoke all
on function public.monitor_mission_status(timestamptz)
from public, anon;

grant execute
on function public.monitor_mission_status(timestamptz)
to authenticated;

commit;

-- 새 함수를 API가 바로 인식하도록 스키마 캐시를 다시 읽게 한다.
notify pgrst, 'reload schema';



-- =========================================================
-- 적용 후 확인 (데이터를 바꾸지 않는 조회만, SQL Editor에서)
-- =========================================================
-- 1) 앱 역할 권한: anon 은 false, authenticated 는 true 여야 한다(관리자 확인은 함수 안에서).
--   select r.role,
--          has_function_privilege(r.role, 'public.monitor_mission_status(timestamptz)', 'execute')
--   from (values ('anon'), ('authenticated')) as r(role);
-- 2) SQL Editor 에서 직접 부르면 auth.uid() 가 없어 42501 로 거부되는 것이 정상이다.
--    숫자는 beta_mission_check.sql 결과와 대시보드 화면을 맞춰 보면 된다.



-- =========================================================
-- 집계에서 뺄 계정 넣기 · 빼기 (SQL Editor에서, 필요할 때만)
-- =========================================================
--   insert into public.monitor_excluded_accounts (user_id, note)
--   select id, '운영자' from auth.users where lower(email) = lower('<메일>')
--   on conflict (user_id) do nothing;
--
--   delete from public.monitor_excluded_accounts
--   where user_id = (select id from auth.users where lower(email) = lower('<메일>'));
--
-- 지금 빠지는 계정 확인:
--   select u.email, x.note from public.monitor_excluded_accounts x join auth.users u on u.id = x.user_id;

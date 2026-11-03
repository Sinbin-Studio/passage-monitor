-- =========================================================
-- Passage Monitor - 공지 쓰기 · 고치기 · 지우기 (TASK-004)
--
-- monitor_playback_admin.sql(관리자 목록 · is_monitor_admin) 다음에
-- SQL Editor 에서 통째로 실행하세요. 여러 번 실행해도 안전합니다.
--
-- 이 스크립트가 하는 일:
--   1) monitor_notice_admins: 공지 권한이 있는 관리자 목록 (관리자 중 일부만).
--      권한은 이 파일 맨 아래 주석의 insert 로 직접 넣는다 (아이디를 코드에 두지 않는다).
--   2) is_notice_admin(): 관리자이면서 공지 권한이 있으면 true. monitor_notice_* 함수 안에서만 쓴다 (직접 호출 불가).
--   3) monitor_notice_list / create / update / delete: 공지 권한이 있을 때만.
--      권한이 없으면 42501 오류.
--
-- 공지는 Passage 의 public.notices 표 (Passage notification_rebuild.sql, D-032).
--   - 새 공지(INSERT)는 Passage 의 Database Webhook(notices_push)이 모든 기기에
--     푸시를 보낸다. 고치기(UPDATE) · 지우기(DELETE)는 푸시가 다시 가지 않는다
--     (Webhook 이 INSERT 에만 걸려 있다 — Passage docs/domain/database.md).
--   - 지우면 읽음 기록(notice_reads)도 함께 지워진다(on delete cascade).
--   - 칸 제한(제목 100자, 요약 200자, 버전 x.y.z, 링크 https)은 notices 의 check 가 지킨다.
--
-- 기존 Passage 표 · 함수 · 정책 · Webhook 은 바꾸지 않는다.
-- =========================================================

begin;



-- =========================================================
-- 1. 공지 권한 목록
-- =========================================================

create table if not exists public.monitor_notice_admins (
  user_id uuid primary key references public.monitor_admins (user_id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.monitor_notice_admins enable row level security;

-- 정책을 만들지 않는다 → RLS 로 모든 행이 막힌다. 권한도 걷어 낸다.
revoke all on public.monitor_notice_admins from public, anon, authenticated;




-- =========================================================
-- 2. 공지 권한 확인
-- =========================================================

create or replace function public.is_notice_admin()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.monitor_notice_admins n
    join public.monitor_admins a on a.user_id = n.user_id
    where n.user_id = (select auth.uid())
  );
$function$;

-- 직접 호출은 막는다 (콘솔에서 공지 권한이 있는지 알아낼 수 없게).
-- monitor_notice_* 함수는 security definer 라 소유자 권한으로 이 함수를 부른다.
revoke all on function public.is_notice_admin() from public, anon, authenticated;



-- =========================================================
-- 3. 공지 목록 (최신순, 전부)
-- =========================================================

create or replace function public.monitor_notice_list()
returns table (
  notice_id uuid,
  kind text,
  title text,
  summary text,
  body text,
  latest_version text,
  android_url text,
  ios_url text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
#variable_conflict use_column
begin
  if not public.is_notice_admin() then
    raise exception 'notice admin only' using errcode = '42501';
  end if;

  return query
  select n.notice_id, n.kind, n.title, n.summary, n.body,
         n.latest_version, n.android_url, n.ios_url, n.created_at
  from public.notices n
  order by n.created_at desc;
end;
$function$;

revoke all on function public.monitor_notice_list() from public, anon;
grant execute on function public.monitor_notice_list() to authenticated;



-- =========================================================
-- 4. 새 공지 (게시하면 Webhook 이 모든 기기에 푸시)
-- =========================================================

create or replace function public.monitor_notice_create(
  p_kind text,
  p_title text,
  p_summary text,
  p_body text,
  p_latest_version text,
  p_android_url text,
  p_ios_url text
)
returns uuid
language plpgsql
volatile
security definer
set search_path to ''
as $function$
declare
  v_id uuid;
begin
  if not public.is_notice_admin() then
    raise exception 'notice admin only' using errcode = '42501';
  end if;

  insert into public.notices (kind, title, summary, body, latest_version, android_url, ios_url)
  values (p_kind, btrim(p_title), btrim(p_summary), coalesce(p_body, ''),
          nullif(btrim(p_latest_version), ''), nullif(btrim(p_android_url), ''), nullif(btrim(p_ios_url), ''))
  returning notice_id into v_id;

  return v_id;
end;
$function$;

revoke all on function public.monitor_notice_create(text, text, text, text, text, text, text) from public, anon;
grant execute on function public.monitor_notice_create(text, text, text, text, text, text, text) to authenticated;



-- =========================================================
-- 5. 고치기 (푸시 다시 안 감, 올린 시각은 그대로)
-- =========================================================

create or replace function public.monitor_notice_update(
  p_notice_id uuid,
  p_kind text,
  p_title text,
  p_summary text,
  p_body text,
  p_latest_version text,
  p_android_url text,
  p_ios_url text
)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $function$
begin
  if not public.is_notice_admin() then
    raise exception 'notice admin only' using errcode = '42501';
  end if;

  update public.notices
  set kind = p_kind,
      title = btrim(p_title),
      summary = btrim(p_summary),
      body = coalesce(p_body, ''),
      latest_version = nullif(btrim(p_latest_version), ''),
      android_url = nullif(btrim(p_android_url), ''),
      ios_url = nullif(btrim(p_ios_url), '')
  where notice_id = p_notice_id;

  if not found then
    raise exception 'notice not found' using errcode = 'P0002';
  end if;
end;
$function$;

revoke all on function public.monitor_notice_update(uuid, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.monitor_notice_update(uuid, text, text, text, text, text, text, text) to authenticated;



-- =========================================================
-- 6. 지우기 (읽음 기록도 함께 지워짐)
-- =========================================================

create or replace function public.monitor_notice_delete(p_notice_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path to ''
as $function$
begin
  if not public.is_notice_admin() then
    raise exception 'notice admin only' using errcode = '42501';
  end if;

  delete from public.notices where notice_id = p_notice_id;

  if not found then
    raise exception 'notice not found' using errcode = 'P0002';
  end if;
end;
$function$;

revoke all on function public.monitor_notice_delete(uuid) from public, anon;
grant execute on function public.monitor_notice_delete(uuid) to authenticated;

commit;

-- 새 함수를 API가 바로 인식하도록 스키마 캐시를 다시 읽게 한다.
notify pgrst, 'reload schema';



-- =========================================================
-- 공지 권한 주기 · 빼기 (SQL Editor에서, 필요할 때만)
-- =========================================================
-- 관리자 목록(monitor_admins)에 먼저 있어야 한다.
--   insert into public.monitor_notice_admins (user_id)
--   select id from auth.users where lower(email) = lower('<아이디>@passage.invalid')
--   on conflict (user_id) do nothing;
--
--   delete from public.monitor_notice_admins
--   where user_id = (select id from auth.users where lower(email) = lower('<아이디>@passage.invalid'));



-- =========================================================
-- 적용 후 확인 (데이터를 바꾸지 않는 조회만, SQL Editor에서)
-- =========================================================
-- 1) 공지 권한 목록: 맨 아래 insert 로 넣은 계정이 나와야 한다.
--   select u.email, n.created_at
--   from public.monitor_notice_admins n join auth.users u on u.id = n.user_id;
-- 2) 앱 역할 권한: 표 · is_notice_admin 은 둘 다 false, monitor_notice_list 는 authenticated 만 true.
--   select r.role,
--          has_table_privilege(r.role, 'public.monitor_notice_admins', 'select') as table_select,
--          has_function_privilege(r.role, 'public.is_notice_admin()', 'execute') as check_execute,
--          has_function_privilege(r.role, 'public.monitor_notice_list()', 'execute') as list_execute
--   from (values ('anon'), ('authenticated')) as r(role);

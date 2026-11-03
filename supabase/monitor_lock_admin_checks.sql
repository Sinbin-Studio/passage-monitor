-- =========================================================
-- Passage Monitor - 권한 확인 함수 직접 호출 막기
--
-- 이미 monitor_playback_admin.sql · monitor_notices.sql 을 실행한 DB 에
-- SQL Editor 에서 한 번 실행하세요. 여러 번 실행해도 안전합니다.
--
-- 왜: is_monitor_admin() · is_notice_admin() 이 로그인한 사용자(authenticated)에게
--     열려 있어, 브라우저 콘솔에서 rpc 로 부르면 "내가 관리자인지 / 공지 권한이
--     있는지" 를 바로 알 수 있었다. 앱 사용자도 같은 Supabase 로 로그인하므로
--     모두 해당된다.
-- 무엇을: 두 함수의 실행 권한을 anon · authenticated 에서 걷어 낸다.
--     monitor_* 함수들은 security definer 라 소유자 권한으로 이 함수들을 부르므로
--     대시보드 화면은 그대로 동작한다.
-- 표 · 다른 함수 · Passage 앱 쪽은 바꾸지 않는다.
-- =========================================================

begin;

revoke all on function public.is_monitor_admin() from public, anon, authenticated;
revoke all on function public.is_notice_admin() from public, anon, authenticated;

commit;

notify pgrst, 'reload schema';



-- =========================================================
-- 적용 후 확인 (조회만)
-- =========================================================
-- 모든 칸이 false 여야 한다.
--   select r.role,
--          has_function_privilege(r.role, 'public.is_monitor_admin()', 'execute') as monitor_check,
--          has_function_privilege(r.role, 'public.is_notice_admin()', 'execute') as notice_check
--   from (values ('anon'), ('authenticated')) as r(role);

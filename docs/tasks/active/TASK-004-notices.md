# TASK-004 공지 탭

- **Task ID:** TASK-004
- **Status:** In Progress — 코드 완료, SQL 실행 · 링크 env 설정됨, 실제 게시 · 고치기 · 지우기 확인 대기
- **Goal:** Passage 앱 공지(`public.notices`)를 대시보드 `/notices` 에서 쓰고 · 고치고 · 지운다. 공지 권한이 있는 관리자만.

## Background

- 사용자 요청 (2026-11-03): "공지라는 새로운 탭 만들어서 진행해줘". 시안 A(왼쪽 목록 + 오른쪽 편집기 · 앱 미리보기)를 골랐다. 디자인 캔버스 https://claude.ai/artifact/Md2e8XN5aN5ohZVKyozjP9 의 `Main.dc.html` · `Confirm.dc.html`.
- Passage 공지 구조는 Passage 저장소(`origin/dev`)에서 확인: `notices` 표, INSERT 에만 걸린 Webhook `notices_push`(모든 기기에 `[공지] 제목` + 요약 푸시), `notice_reads` on delete cascade, 앱 업데이트 버튼은 `latest_version` + 해당 플랫폼 링크가 있으면 같은 버전이어도 보임.
- 결정: [D-007](../../DECISIONS.md#d-007).

## Done

- `src/lib/notices.ts` (+ 테스트): 제목에서 버전 뽑기, 게시 전 검사(`checkNotice`), 본문 블록(`## ` · `- ` · 문단), 한국 날짜.
- `supabase/monitor_notices.sql`: `monitor_notice_admins` 표(계정은 SQL Editor 에서 직접 넣음), `is_notice_admin()`, `monitor_notice_list / create / update / delete` (권한 없으면 42501).
- `/notices`: 올린 공지 목록, 새 공지 · 고치기 · 지우기, 실시간 검사(업데이트 공지는 제목에 버전 · 스토어 링크 설정 필수), 앱 공지 상세 미리보기, 확인 창 3개. 권한 없으면 "공지 권한이 없습니다".
- 메뉴에 큰 탭 `공지`. `.env.example` 에 `NOTICE_ANDROID_URL` · `NOTICE_IOS_URL` (서버 전용).

## Remaining

1. ~~`supabase/monitor_notices.sql` 실행.~~ 사용자가 실행함 (2026-11-03)
2. ~~스토어 링크 env 설정.~~ 사용자가 넣음 (2026-11-03, "url 넣었고 문제 없어보여")
3. 공지 권한 계정으로 로그인해 `/notices` 목록이 앱 공지와 같은지 확인. 안내 공지 하나로 게시 → 푸시 · 앱 표시 → 고치기(푸시 다시 안 감) → 지우기를 실제로 확인.
4. ~~공지 권한 없는 계정 화면 확인.~~ 사용자가 공지 권한 없는 관리자 계정(저작권 · 미션만)으로 확인 (2026-11-03)
5. ~~`supabase/monitor_lock_admin_checks.sql` 실행.~~ 사용자가 실행, 확인 조회 anon · authenticated 모두 false (2026-11-03)

## Verification

- 2026-11-03: `npm test` (63 통과), `npm run typecheck`, `npm run lint`, `npm run build` 통과.
- 예시 데이터 빌드(`next start -p 3005`, 링크 env 있음)에서 브라우저 확인: 목록 · 새 공지 · 버전 찾음 안내 · 미리보기(업데이트하기 버튼) · 게시 확인 창 → "예시 데이터 화면에서는 저장할 수 없어요." (Server Action 왕복), 고치기 화면, 지우기 확인 창, 390px 폭, 콘솔 오류 없음.
- 2026-11-03: anon key 로 REST 를 직접 불러(조회만) `is_notice_admin` · `is_monitor_admin` · `monitor_notice_list` 실행, `monitor_notice_admins` · `monitor_admins` 조회가 모두 42501 인 것 확인. Passage `notices` 는 authenticated 조회만 열려 있고 쓰기 권한은 없음(Passage `notification_rebuild.sql`).
- 2026-11-03: 사용자가 lock SQL 적용 후 `has_function_privilege` 로 두 권한 확인 함수가 anon · authenticated 모두 실행 불가인 것 확인.
- **UNVERIFIED:** 로그인 상태 콘솔에서 실제로 부르기(42501 이어야 함), 실제 게시 · 고치기 · 지우기, 푸시 발송 · 고치기 때 푸시 재발송 없음, 링크 env 가 없을 때 실제 서버에서 업데이트 공지 차단(검사 함수 테스트로만 확인).

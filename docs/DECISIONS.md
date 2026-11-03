# DECISIONS

Accepted 된 중요한 기술·구조 결정만 기록한다. 바꿀 때는 새 항목을 추가하고 기존 항목을 Superseded 로 표시한다.

## D-001

- **Date:** 2026-10-19
- **Status:** Accepted
- **Context:** 기획안이 Next.js + TypeScript + Vercel 을 지정했다. 저장소에는 Vite 기본 파일만 있었고 소스는 없었다.
- **Decision:** Next.js 16 (App Router, `src/` 디렉터리, Turbopack) + TypeScript + Tailwind CSS v4 + Vitest, 패키지 매니저 npm 으로 새로 구성한다.
- **Reason:** 기획안의 스택을 따르고, Vercel 배포와 서버 측 Supabase 세션 처리가 자연스럽다.
- **Alternatives:** 기존 Vite SPA 유지 — 기획안과 다르고 서버 측 인증 처리가 어렵다.
- **Consequences:** 환경 변수 이름이 `VITE_*` 에서 `NEXT_PUBLIC_*` 로 바뀌었다. 기존 Vite 파일은 저장소에서 제거했다.
- **Related Task:** [TASK-000](tasks/completed/TASK-000-stack-setup.md)
- **Evidence:** `package.json`, 커밋 `bee3490`

## D-002

- **Date:** 2026-10-19
- **Status:** Accepted
- **Context:** 테스터 활동 데이터는 기존 Passage 앱의 Supabase 프로젝트에 있다.
- **Decision:** 새 Supabase 프로젝트를 만들지 않고 기존 Passage 프로젝트에 연결한다. 관리자 계정도 같은 Supabase Auth 를 쓴다.
- **Reason:** 데이터 복제·동기화가 필요 없다. 기획안의 "동일한 Supabase DB 활용" 방침과 같다.
- **Alternatives:** 별도 프로젝트 + 데이터 동기화 — 실시간성이 떨어지고 동기화 비용이 든다.
- **Consequences:** 앱 사용자와 관리자가 같은 `auth.users` 에 있으므로 관리자 목록으로 구분해야 한다. 대시보드용 테이블은 운영 DB 에 추가된다.
- **Related Task:** [TASK-001](tasks/active/TASK-001-db-schema-and-aggregation-design.md)
- **Evidence:** 사용자 확인 (2026-10-19 대화)

## D-003

- **Date:** 2026-10-19
- **Status:** Accepted
- **Context:** Passage 앱 테이블은 RLS 로 본인 데이터만 조회하도록 되어 있을 가능성이 높아(**UNVERIFIED**) 관리자가 anon key 로 다른 테스터 데이터를 읽지 못할 수 있다.
- **Decision:** DB 에 `security definer` 집계 함수를 두고, 함수 안에서 호출자가 관리자인지 확인한 뒤 담당 테스터의 미션 집계 숫자만 반환한다. 대시보드는 anon key + 로그인 세션으로 이 함수만 호출한다.
- **Reason:** 원본 데이터·개인정보가 대시보드로 나가지 않고, 권한 확인이 DB 한 곳에 모인다.
- **Alternatives:** 서버에서만 service role key 사용 — 구현은 빠르지만 RLS 를 통째로 우회하므로 키 유출·권한 확인 누락 시 전체 DB 가 노출된다.
- **Consequences:** 집계 로직 일부가 SQL 에 들어간다. 상태 판정은 TS(`lib/missions.ts`) 에서 할지 SQL 에서 할지 TASK-001 에서 정한다.
- **Related Task:** [TASK-001](tasks/active/TASK-001-db-schema-and-aggregation-design.md)
- **Evidence:** 사용자 확인 (2026-10-19 대화)

## D-004

- **Date:** 2026-10-19
- **Status:** Accepted
- **Context:** UI 시안 A(사이드바) · B(미션 매트릭스) · C(상태 보드) 를 비교했다.
- **Decision:** "C + B · 보드 메인 + 매트릭스 탭" 시안으로 확정한다. 현황 보드가 메인 탭, 미션 매트릭스가 두 번째 탭이고 유형 필터를 두 탭이 공유한다. 매트릭스 행을 누르면 보드에서 해당 테스터 상세를 연다. 글꼴 Gothic A1, 브랜드 색 `#6A45F0`.
- **Reason:** 보드는 "누구를 먼저 챙길지"를, 매트릭스는 "어떤 미션이 비었는지"를 한눈에 보여준다.
- **Alternatives:** A 단독(목록 + 상세 패널), B 단독, C 단독.
- **Consequences:** 색상 토큰은 `src/app/globals.css` 에 반영했다. 미션 화면 구성(보드 + 매트릭스)은 [D-006](#d-006) 으로 대체했다 — 색 · 글꼴은 그대로 쓴다.
- **Related Task:** —
- **Evidence:** 디자인 캔버스 https://claude.ai/artifact/LJX8HS5TsCYFSjMrn2kpLh 의 `Combined.dc.html` (소유자 계정에서만 열림)

## D-005

- **Date:** 2026-10-30
- **Status:** Accepted
- **Context:** 재생 현황을 실제 DB 에 연결하려면 관리자 로그인과 관리자 목록이 필요하다. Passage DB 에는 관리자 개념이 없고, `playback_session_facts()` 는 앱 역할에 실행 권한이 없다.
- **Decision:** 관리자는 Supabase Auth 에 **이메일 + 비밀번호 계정을 따로** 만들어 쓴다 (방법 A). 화면에서는 **아이디**로 로그인하고, 코드가 `아이디@NEXT_PUBLIC_ADMIN_ID_DOMAIN`(기본 `passage.invalid`) 으로 바꿔 Supabase 에 넘긴다. 실제 메일함이 아니므로 계정은 "Auto Confirm User" 로 만들고, 비밀번호 재설정은 Supabase 대시보드에서 한다 (사용자 결정: 아이디 형식, 2026-10-30. 도메인 기본값은 Claude 가 정함). 관리자 목록은 `public.monitor_admins(user_id)` 표에 두고 SQL Editor 에서만 추가·삭제한다. 대시보드는 `monitor_playback_facts(p_from, p_to)` 만 부르며, 이 함수가 관리자 확인 후 `playback_session_facts()` 의 필요한 칸만 돌려준다. SQL 은 `supabase/monitor_playback_admin.sql` (Passage 저장소 방식대로 SQL Editor 에서 통째로 실행).
- **Reason:** 앱 사용자 계정과 섞이지 않고, 권한 확인이 DB 한 곳에 있다 ([D-003](#d-003)).
- **Alternatives:** 대시보드에서 구글 로그인 (앱이 쓰는 Google 설정 재사용) — 새 로그인 방식을 열지 않지만 Google 웹 OAuth 설정 확인이 필요하다. 사용자가 이메일을 골랐다 (2026-10-30). Passage 앱 로그인(구글 · 애플)은 바뀌지 않는다.
- **Consequences:** Supabase 이메일 로그인을 켜야 한다 (**UNVERIFIED**). 켜면 anon key 로 누구나 이메일 계정을 만들 수 있다 — 그 계정은 `pending` 이라 앱 커뮤니티에 못 들어가고 `monitor_admins` 에 없어 대시보드 데이터도 못 본다. 관리자 계정도 가입 트리거로 `profiles` 에 `pending` 행이 생긴다 (앱 커뮤니티 접근 불가). 표·함수 이름, 기간 필수 · 최대 93일 제한은 Claude 가 정했다.
- **Related Task:** [TASK-002](tasks/active/TASK-002-playback-admin.md)
- **Evidence:** 사용자 확인 (2026-10-30 대화 "A로 해")

## D-006

- **Date:** 2026-11-03
- **Status:** Accepted
- **Context:** 미션 화면(TASK-003)을 다시 시작했다. 사용자가 최종 미션 표 · 집계 SQL(`beta_mission_check.sql`) · 손으로 만든 엑셀(`beta_mission_status_261031.xlsx`)을 줬고, 시안 3개 중 A(구분별 표)를 골랐다.
- **Decision:** 미션 기준을 사용자 최종 표로 바꾼다(최초 녹음 · 일반 게시글 코멘트 · 재연습 업로드 · 재연습 글 코멘트, 구분 = `profiles.role`). 이전 튜토리얼 PDF 기준과 [D-004](#d-004)의 "보드 + 매트릭스" 미션 화면은 대체한다(색 · 글꼴 토큰은 그대로). 집계는 사용자 SQL 을 그대로 감싼 `monitor_mission_status(p_since)` ([D-003](#d-003) 방식). 엑셀은 라이브러리 없이 `src/lib/xlsx.ts` 로 브라우저에서 만들고, 사용자 엑셀과 같은 3시트 · 서식 · 수식으로 뽑는다.
- **Reason:** 사용자가 운영에서 쓰는 기준 · 파일 모양과 화면 숫자가 같아야 한다. 의존성을 늘리지 않고, 필요한 기능(서식 · 수식 · 틀 고정 · 필터 · 조건부 서식)만 쓴다.
- **Alternatives:** `exceljs` 등 라이브러리 — 기능은 많지만 번들이 크고 의존성이 는다. CSV — 서식 · 시트 여러 개를 못 담는다.
- **Consequences:** 화면 · 엑셀에 테스터 계정(Google 메일 또는 `apple`)이 나온다(사용자 엑셀에 있는 칸, [RULES](RULES.md) "최소 식별 정보" 의 예외로 사용자가 요청). 운영자 · 사용자 테스트 계정은 집계에서 뺀다 — 처음엔 SQL 안에 메일로 적었으나 저장소 공개에 맞춰 `monitor_excluded_accounts` 표로 옮겼다(2026-11-03). 조건부 서식 칠은 `bgColor` 로 쓴다 — 사용자 엑셀의 `fgColor` 는 Excel 에서 칠해지지 않았다(COM 으로 확인). 상태 이름 · 화면 정렬 · 집계 시작일 입력은 Claude 가 정했다.
- **Related Task:** [TASK-003](tasks/completed/TASK-003-mission-progress.md)
- **Evidence:** 사용자 대화 2026-11-03 ("A안으로 가고 ... 엑셀로 다운받을수 있게"), 디자인 캔버스 https://claude.ai/artifact/DZdr1sk2Wx2e3ai8jG5Dff 의 `Main.dc.html`

## D-007

- **Date:** 2026-11-03
- **Status:** Accepted
- **Context:** 공지 탭(TASK-004)으로 Passage 앱 공지(`public.notices`)를 대시보드에서 쓰려 한다. 공지를 넣으면 Passage Webhook 이 모든 기기에 바로 푸시를 보낸다. 나중에 미션 · 저작권만 보는 관리자 계정도 만들 예정이다.
- **Decision:** 공지 권한은 관리자 목록과 따로 `public.monitor_notice_admins(user_id)` 에 두고(처음엔 운영자 대시보드 계정 하나만), 권한 확인은 `monitor_notice_*` 함수가 한다 ([D-003](#d-003) 방식). 권한이 없어도 공지 탭은 보이고 페이지에 "공지 권한이 없습니다"를 띄운다. 게시는 확인 창 뒤 바로 한다. 업데이트 공지의 새 버전은 **제목에서 뽑고**(x.y.z), 없으면 게시를 막는다. 스토어 링크는 서버 전용 환경 변수 `NOTICE_ANDROID_URL` · `NOTICE_IOS_URL` 에 고정하고, 둘 중 하나라도 없으면 업데이트 공지 게시를 막는다(안내 공지는 된다). 쓰기는 Server Action 이 검사 → RPC 순으로 한다.
- **Reason:** 공지는 모든 사용자에게 푸시가 가므로 권한을 좁게 둔다. 버전 · 링크를 따로 적지 않아 잘못 넣을 일을 줄인다(사용자 결정, 2026-11-03).
- **Alternatives:** 관리자 전원에게 공지 권한 — 나중에 만들 조회 전용 계정과 나눌 수 없다. 링크를 공지마다 입력 — 실수 여지가 크다.
- **Consequences:** 앱은 같은 버전이어도 업데이트하기 버튼을 보여 주므로(Passage `origin/dev` 테스트로 확인) 제목 버전이 지금 버전과 같아도 문제없다. 고치기는 푸시를 다시 보내지 않고(Webhook 이 INSERT 에만), 고칠 때 링크는 그때 환경 변수 값으로 다시 넣는다. 지우면 읽음 기록도 지워지고 이미 보낸 푸시는 회수되지 않는다. 권한 계정은 SQL Editor 에서 직접 넣는다(저장소 공개에 맞춰 아이디를 SQL 에서 뺌, 2026-11-03). 확인 창 문구 · 표 · 함수 이름은 Claude 가 정했다.
- **Related Task:** [TASK-004](tasks/active/TASK-004-notices.md)
- **Evidence:** 사용자 대화 2026-11-03 ("A안으로가는데", 권한 · 링크 · 버전 질문 답), 디자인 캔버스 https://claude.ai/artifact/Md2e8XN5aN5ohZVKyozjP9

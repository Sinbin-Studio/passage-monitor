# TASK-002 재생 기록 관리 화면 (Passage TASK-031)

- **Task ID:** TASK-002
- **Status:** In Progress — 재생 현황 화면 (예시 데이터) 완료, DB 연결 대기
- **Goal:** Passage 재생 기록을 관리자가 보고, 제외 기준을 바꿔 가며 정산 대상 재생 수를 확인하고, 파일로 받는 화면을 만든다.

## Background

요구사항 원문: Passage 저장소 `docs/tasks/active/TASK-031-playback-admin-web.md`. 재생 횟수 세는 기준(2026-10-30 사용자 결정)과 Claude가 임의로 정한 값은 [README](../../../README.md) "재생 기록 관리" 에 있다. 시안: 디자인 아티팩트 (재생 현황 / 재생 기록 / 정산 · 파일).

## Done

- `src/lib/playback.ts`: 재생 하나 판정(`judgePlay`), 곡별/녹음별 집계(`summarizePlays`), 예상 금액(`estimateWon`, 단가는 환경 변수). 순수 함수 + `playback.test.ts`.
- `/login` 아이디 + 비밀번호 로그인 (`src/lib/admin-login.ts` 가 아이디 → 계정 이메일), 로그아웃 버튼. 로그인 안 했으면 `/playback` → `/login`.
- `/playback` 이 Supabase 연결 정보가 있으면 `monitor_playback_facts` 로 실제 데이터를 불러온다 (한국 시간 달 단위, 앞뒤 달 이동). 관리자가 아니면 "관리자로 등록되어 있지 않습니다". 연결 정보가 없으면 예시 데이터. 행 변환은 `src/lib/playback-rows.ts` (+ 테스트).
- `/settlement` 정산 · 파일: KOMCA 정산 기준(아직 없음, 보고서 버튼 막힘), 지금 쓰는 제외 기준(재생 현황에서 고른 것이 따라옴), 예상 계산안(정산 대상 × 단가, 곡별 5줄 + 더보기, 합계, 전체 재생 기준 금액과 제외 · 확인 필요로 빠진 금액), 파일 받기(곡별 / 녹음별 / 재생 하나씩 CSV, 미리보기).
- `/records` 재생 기록: 녹음 목록 → 녹음 하나의 들은 사람 목록(닉네임 표시 — 사용자 요청, 전체 → 정산 대상, 올린 사람 표시, 뺀 것 있음 / 확인 필요 있음 거르기), 방문별 흐름 카드, 재생별 결과(셈 / 뺌 / 확인 필요 + 이유). `src/lib/playback-timeline.ts` (+ 테스트), `supabase/monitor_playback_timeline.sql`. `judgePlay` 가 확인 필요 까닭(`missing`)도 돌려준다.
- `/playback` 재생 현황: 시안대로. 제외 기준 스위치 · 시간 옵션, KPI 4개, 곡별/녹음별 표(5줄 + 더보기/접기), CSV 받기. 데이터는 `src/app/playback/sample-data.ts` 예시 (시안과 같은 숫자).

## Remaining

1. DB: `supabase/monitor_playback_admin.sql` 작성 완료 ([D-005](../../DECISIONS.md#d-005)). **사용자가 SQL Editor 에서 실행**하고, 관리자 계정을 만들어 `monitor_admins` 에 넣어야 한다.
2. 사용자 준비 후 실제 로그인 · 조회 확인 (아래 Verification).
3. 사용자가 `supabase/monitor_playback_timeline.sql` 을 SQL Editor 에서 실행. 정산 · 파일의 저장한 조건 · KOMCA 기준 등록 · Excel(.xlsx).
4. 사용자 결정 대기: "이 곡의 기록" 시트 미리 듣기를 셀지 뺄지, 확인 필요 재생의 정산 처리, 예상 계산안 기준(정산 대상 × 단가)과 반올림, Passage TASK-031 결정 필요 2–5 (1 로그인 방식은 D-005 로 결정).

## Verification

- 2026-10-30: `npm test` (23 통과), `npm run typecheck`, `npm run lint`, `npm run build` 통과. `next start` 로 `/playback` 을 브라우저에서 열어 숫자(781 / 1,284 / 459 / 44)가 시안과 같고, 스위치 · 곡별/녹음별 · 더보기/접기가 동작함을 확인.
- CSV 다운로드는 브라우저에서 눌러 보지 않았다 — **UNVERIFIED**.
- 2026-10-30: 가짜 env 로 build · start → 로그인 안 한 `/playback` 이 `/login` 으로 보내지고 로그인 폼이 보임. 테스트 28 통과.
- 2026-10-30: 예시 데이터 모드로 `/settlement` 확인 — 재생 현황에서 켠 기준이 따라오고 (625회 → 812.5원), 812.5 + 813.8 + 42.9 = 1,669.2원, 재생 하나씩 미리보기에 사유 표시. CSV 파일 실제 다운로드는 눌러 보지 않음 (**UNVERIFIED**).
- 사용자 dev 서버에서 "Blocking Route ... `Date.now()`" 오류 (`/playback`, `/records`): Supabase `getClaims()` 가 토큰 만료 확인에 현재 시각을 읽는데, cacheComponents 의 미리 그리기 검사는 쿠키를 읽은 뒤에도 현재 시각을 막는다. `loadMonth` 맨 앞에 `await connection()` 을 넣어 고침 (처음엔 세션을 먼저 읽게 옮겼으나 그것으로는 부족했음). 로그인 상태 재현 확인은 사용자 몫 — **UNVERIFIED**.
- 2026-10-30: 예시 데이터로 `/records` 확인 — 녹음 목록, R-0142 의 p_7f3a 흐름이 시안과 같음, 들은 사람 바꾸기 · 확인 필요 거르기 동작. 테스트 42 통과.
- `supabase/monitor_playback_timeline.sql`: 실행해 보지 않음 — **UNVERIFIED**.
- 실제 로그인 · `monitor_playback_facts` 조회 · 비관리자 거부: **UNVERIFIED** (SQL 미적용, env 없음).
- `supabase/monitor_playback_admin.sql`: 실행해 보지 않았다 (로컬 Postgres 없음) — **UNVERIFIED**. 실행 후 파일 맨 아래 "적용 후 확인" 으로 권한을 확인한다.

## Related Files

- `src/lib/playback.ts`, `src/lib/playback.test.ts`
- `src/lib/playback-rows.ts`, `src/lib/playback-rows.test.ts`
- `src/lib/playback-export.ts`, `src/lib/csv.ts` (+ 테스트), `src/lib/admin-login.ts`
- `src/app/login/`, `src/app/(admin)/` (layout, load-month, rules-context, ui, playback/, settlement/)
- `README.md` "재생 기록 관리"
- `supabase/monitor_playback_admin.sql`

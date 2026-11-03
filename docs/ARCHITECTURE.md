# ARCHITECTURE

현재 구현된 구조만 Current 로 적는다. 아직 없는 것은 Planned 로 구분한다.

## 전체 흐름

```
Passage Flutter App ──writes──▶ Supabase (기존 Passage 프로젝트, PostgreSQL + Auth)
                                        ▲
                                        │ reads (anon key + 로그인 세션)
                                        │
                        Next.js Dashboard (이 저장소) ──▶ 관리 업체 담당자 (브라우저)
```

이 저장소는 Passage 앱과 별도 프로젝트이며, Supabase 프로젝트는 새로 만들지 않고 기존 것을 공유한다 ([D-002](DECISIONS.md#d-002)).

## Runtime

- Next.js 16 App Router, Turbopack. `next.config.ts` 에 `cacheComponents: true` 가 켜져 있다 → `cookies()` 등 요청 데이터를 쓰는 코드는 `<Suspense>` 경계 안에 두어야 prerender 가 깨지지 않는다.
- Next 16 에서 `middleware` 는 `proxy` 로 이름이 바뀌었다. 요청 전처리는 `src/proxy.ts`.
- 배포 대상 Vercel (**Planned**).

## Components (Current)

| 경로 | 책임 | 의존 |
| --- | --- | --- |
| `src/app/` | 페이지 · 레이아웃 · 전역 스타일. `globals.css` 에 확정 디자인 색상 토큰(Tailwind `@theme`) | `lib/*` |
| `src/proxy.ts` | 모든 요청(정적 파일 제외)에서 Supabase Auth 세션 갱신. 로그인한 채 `/login` 에 오면 `/playback` 으로 보낸다 | `lib/supabase/proxy` |
| `src/lib/supabase/env.ts` | `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` 읽기, 없으면 throw | — |
| `src/lib/supabase/client.ts` | Client Component 용 브라우저 클라이언트 | `env` |
| `src/lib/supabase/server.ts` | Server Component / Route Handler 용 서버 클라이언트 (요청마다 생성) | `env`, `next/headers` |
| `src/lib/supabase/proxy.ts` | proxy 용 세션 갱신, 로그인 상태의 `/login` → `/playback`. env 가 없으면 갱신 없이 통과 | — |
| `src/lib/missions.ts` | 베타테스트 최종 미션 기준(구분별 목표), 진행률 · 상태 판정, 화면 · 엑셀 정렬. 순수 함수 (DB·React 의존 없음) | — |
| `src/lib/notices.ts` | 공지 게시 전 검사(제목에서 버전 뽑기, 업데이트 공지 링크 필수), 본문 블록, 한국 날짜. 순수 함수 | — |
| `src/lib/playback.ts` | 재생 횟수 세는 기준: 재생 하나 판정, 곡별/녹음별 집계, 예상 금액. 순수 함수 | — |
| `src/lib/playback-rows.ts` | `monitor_playback_facts` 행 → `PlaybackFact`, 한국 시간 달 범위. 순수 함수 | `lib/playback` |
| `src/app/login/` | 관리자 이메일 + 비밀번호 로그인 (브라우저 클라이언트) | `lib/supabase` |
| `src/app/(admin)/` | 관리자 화면 묶음. `layout.tsx` 에 메뉴 · 로그아웃 · 제외 기준 상태(`rules-context.tsx`, 화면을 옮겨도 유지). `load-month.tsx` 가 `<Suspense>` 안에서 세션 확인 → `monitor_playback_facts` 호출 (env 가 없으면 `sample-data.ts`). `ui.tsx` 공용 조각 | `lib/playback*`, `lib/csv`, `lib/supabase` |
| `src/app/(admin)/admin-nav.tsx` | 큰 탭 `저작권` / `미션` / `공지`, 저작권 아래 작은 탭 (재생 현황 · 재생 기록 · 정산 · 파일) | — |
| `src/app/(admin)/missions/` | 미션 현황: 구분별 표, 집계 시작일(`?since=`), 엑셀 받기. `load-missions.ts` 가 세션 확인 → `monitor_mission_status` (env 가 없으면 예시 데이터) | `lib/missions`, `lib/mission-export`, `lib/supabase` |
| `src/app/(admin)/notices/` | 공지: 올린 공지 목록 · 새 공지 · 고치기 · 지우기, 앱 미리보기, 확인 창. `load-notices.ts` 가 세션 확인 → `monitor_notice_list` (권한 없으면 "공지 권한이 없습니다", env 가 없으면 예시 데이터). `actions.ts` Server Action 이 `checkNotice` → `monitor_notice_create/update/delete` → `refresh()` | `lib/notices`, `lib/supabase` |
| `src/app/(admin)/playback/` | 재생 현황 | 위 |
| `src/app/(admin)/records/` | 재생 기록: 녹음 목록, 녹음 하나의 들은 사람별 흐름 · 재생별 결과 (`monitor_playback_timeline`) | 위, `lib/playback-timeline` |
| `src/lib/playback-timeline.ts` | 들은 사람별 요약, 방문별 흐름, 재생별 결과 설명. 순수 함수 | `lib/playback`, `lib/playback-rows` |
| `src/app/(admin)/settlement/` | 정산 · 파일: KOMCA 기준(자리), 지금 쓰는 제외 기준, 예상 계산안, CSV 받기 | 위 |
| `src/lib/xlsx.ts`, `src/lib/mission-export.ts` | 라이브러리 없는 .xlsx 작성기(stored zip, 서식 · 수식 · 틀 고정 · 필터 · 조건부 서식), 미션 현황 엑셀 3시트. 순수 함수 | `lib/missions` |
| `src/lib/playback-export.ts`, `src/lib/csv.ts` | 곡별 · 녹음별 · 재생 하나씩 내보내기 표, CSV 문자열. 순수 함수 | `lib/playback` |

의존 방향: `app` → `lib/supabase`, `lib/missions`, `lib/playback`. `lib/missions` · `lib/playback` 은 아무것도 의존하지 않는다.

메인 화면(`src/app/page.tsx`)은 없다. `/` 는 `next.config.ts` 의 `redirects` 로 `/login` 에 보낸다 (307). 로그인 · 관리자 화면은 실제 Supabase 에 연결돼 동작한다 (사용자 확인).

## Boundaries

- **권한 경계 (Planned, [D-003](DECISIONS.md#d-003))**: 대시보드는 Passage 테이블을 직접 조회하지 않는다. DB 의 집계 함수(`security definer`)가 호출자가 관리자인지 확인한 뒤 담당 테스터의 **집계 숫자만** 반환한다. service role key 는 쓰지 않는다. 권한 확인 함수 `is_monitor_admin()` · `is_notice_admin()` 은 앱 역할(anon · authenticated)이 직접 부를 수 없다 — 콘솔에서 내 권한을 알아내는 통로를 막기 위해서다 (`supabase/monitor_lock_admin_checks.sql`). 권한 표 `monitor_admins` · `monitor_notice_admins` 도 앱 역할에 권한이 없다.
- **비밀값**: 브라우저에 노출되는 값은 `NEXT_PUBLIC_*` (URL, anon key, 관리자 아이디 도메인) 뿐이다. 공지 스토어 링크 `NOTICE_ANDROID_URL` · `NOTICE_IOS_URL` 은 서버에서만 읽는다.
- **데이터 노출**: 녹음 원본·상세 음성 데이터·불필요한 개인정보는 대시보드로 가져오지 않는다.

## Persistence

이 저장소는 자체 저장소가 없다. 모든 데이터는 기존 Passage Supabase 에 있다.

- Passage 앱 테이블 구조: **UNVERIFIED** (아직 확인하지 않음).
- `supabase/monitor_playback_admin.sql` (작성됨, DB 적용 **UNVERIFIED**): `monitor_admins` 표, `is_monitor_admin()`, `monitor_playback_facts(p_from, p_to)` ([D-005](DECISIONS.md#d-005)).
- `supabase/monitor_mission_status.sql` (작성됨, DB 적용 **UNVERIFIED**): `monitor_excluded_accounts` 표(집계에서 뺄 운영자 · 테스트 계정, 메일을 코드에 두지 않음), `monitor_mission_status(p_since)` — 관리자 확인 후 베타테스터(`profiles.role` user · skilled · expert, 뺄 계정 제외)의 닉네임 · 계정(Google 메일 또는 `apple`) · 미션 실적 개수 4개. 세는 기준은 사용자 SQL `beta_mission_check.sql` 과 같다.
- `supabase/monitor_notices.sql` (작성됨, DB 적용 **UNVERIFIED**): `monitor_notice_admins` 표(공지 권한, 계정은 SQL Editor 에서 직접 넣음), `is_notice_admin()`, `monitor_notice_list / create / update / delete` — Passage `public.notices` 를 읽고 쓴다. 새 공지는 Passage Webhook 이 푸시를 보낸다 ([D-007](DECISIONS.md#d-007)).
- `supabase/monitor_playback_timeline.sql` (작성됨, DB 적용 **UNVERIFIED**): `monitor_playback_timeline(p_post_id, p_from, p_to)` — 관리자 확인 후 녹음 하나의 재생 · 이벤트를 jsonb 로 반환. 들은 사람은 가명 `listener_id` + 닉네임(`profiles.username`), 계정 id · 이메일은 넘기지 않음.
- 대시보드 전용 추가 테이블 (**Planned**, 이름·구조 미확정): 베타테스터 명단(user_id · 유형 · 담당 업체), 대시보드 관리자 목록, 설문 제출 수동 확인 기록. 기존 앱 테이블과 섞이지 않게 접두어 또는 별도 스키마로 분리하고 마이그레이션 파일로 관리한다.

## UI 구조 (Planned)

확정 디자인 [D-004](DECISIONS.md#d-004): 상단 탭 `현황 보드`(메인) / `미션 매트릭스`, 두 탭이 공유하는 유형 필터, 매트릭스 행 클릭 → 보드 상세.

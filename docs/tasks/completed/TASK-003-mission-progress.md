# TASK-003 미션 진행 화면

- **Task ID:** TASK-003
- **Status:** Completed — PR #2 머지, 사용자가 DB 함수 실행 후 "문제없어" 확인 (2026-11-03)
- **Goal:** 베타테스터 구분(일반인 · 실력자 · 전문가)별 미션 실적을 `/missions` 에서 보여 주고, 사용자 엑셀과 같은 모양의 .xlsx 로 받을 수 있게 한다.

## Background

- 사용자가 최종 미션 표 · 집계 SQL(`beta_mission_check.sql`) · 엑셀(`beta_mission_status_261031.xlsx`)을 줬다 (2026-11-03). 기준은 [domain/missions.md](../../domain/missions.md), 결정은 [D-006](../../DECISIONS.md#d-006).
- 시안: 디자인 캔버스 https://claude.ai/artifact/DZdr1sk2Wx2e3ai8jG5Dff — A안(구분별 표) 선택, B · C 안은 쓰지 않음.

## Done

- `src/lib/missions.ts` 최종 기준으로 다시 씀 (+ 테스트): 목표, 진행률(목표 초과분 제외), 상태(완료 · 진행 중 · 미활동), 화면 · 엑셀 정렬.
- `src/lib/xlsx.ts` (라이브러리 없는 .xlsx 작성기) + `src/lib/mission-export.ts` (3시트: 미션 현황 · 구분별 요약 · 미션 기준, 사용자 엑셀과 같은 열 · 너비 · 서식 · 수식 · 틀 고정 · 필터 · 목표 달성 연두색) + 테스트.
- `supabase/monitor_mission_status.sql`: 관리자만, 사용자 SQL 과 같은 기준으로 테스터별 개수 4개 + 닉네임 · 계정.
- `/missions`: 완료 인원 타일 4개, 구분 필터, 미완료만 보기, 구분별 표(해당 미션만 열로), 집계 시작일(`?since=YYYY-MM-DD`, 한국 0시), 엑셀로 받기(`beta_mission_status_YYMMDD.xlsx`, 필터와 무관하게 전체).

## Remaining

1. ~~사용자가 `supabase/monitor_mission_status.sql` 을 SQL Editor 에서 실행.~~ 완료 (2026-11-03)
2. ~~관리자 로그인으로 `/missions` 확인.~~ 사용자가 "문제없어" (2026-11-03)

## Verification

- 2026-11-03: `npm test` (53 통과), `npm run typecheck`, `npm run lint`, `npm run build` 통과.
- 예시 데이터 빌드(`next start`)로 `/missions` 를 브라우저에서 열어 시안 A 와 같은 구성, 구분 필터 · 미완료만 보기 동작, 콘솔 오류 없음 확인.
- 생성한 .xlsx 를 Excel(COM)로 열어: 시트 3개, 수식 재계산 값, 틀 고정 · 필터, 목표 달성 칸 · "완료" 칸 연두색 확인.
- **UNVERIFIED:** DB 함수 실행 · 실제 숫자, 비관리자 거부, 브라우저에서 "엑셀로 받기" 버튼으로 받은 파일 (생성 함수는 위처럼 확인), 집계 시작일을 바꿨을 때 실제 DB 결과.

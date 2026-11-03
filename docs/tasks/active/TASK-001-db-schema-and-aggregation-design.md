# TASK-001 Passage DB 스키마 파악 및 집계 함수 · 추가 테이블 설계

- **Task ID:** TASK-001
- **Status:** Blocked — 스키마 대기
- **Goal:** 기존 Passage DB 에서 미션별 실적을 어떻게 집계할지 정하고, 대시보드용 추가 테이블과 관리자 확인 집계 함수의 설계안(SQL 초안 포함)을 만든다.

## Background

연결은 기존 Passage Supabase 프로젝트로 하고([D-002](../../DECISIONS.md#d-002)), 권한은 `security definer` 집계 함수가 관리자 여부를 확인하는 방식으로 정했다([D-003](../../DECISIONS.md#d-003)). 미션 기준과 집계 원칙은 [domain/missions.md](../../domain/missions.md) 에 있다. Passage 테이블 구조는 아직 모른다.

## Scope

- 미션 7종 각각에 대응하는 테이블 · 컬럼 · 조건 매핑
- 대시보드 전용 테이블 설계: 베타테스터 명단(user_id · 유형 · 담당 업체), 관리자 목록, 설문 수동 확인 기록
- 집계 함수 시그니처와 반환 형태 (테스터별 미션 실적 + 마지막 활동 시각)
- 상태 판정 위치 결정: TS(`lib/missions.ts`) vs SQL
- 마이그레이션 파일 위치 · 이름 규칙 결정

## Out of Scope

- 대시보드 화면 구현
- 운영 DB 에 실제 마이그레이션 적용 (사용자 승인 후 별도 Task)
- Passage 앱 수정 (열람 기록이 없을 경우 필요성만 보고)

## Prerequisites

- 사용자로부터 Passage DB 스키마 수령 (`supabase db dump --schema-only` 또는 Table Editor 화면)
- 현재 RLS 정책 정보 (있으면)

## Steps

1. 스키마를 받는다.
2. 녹음 · 재녹음(원본 연결) · 피드백(댓글) · 후속 피드백(재녹음 게시글 댓글) · 유용해요 · 받은 피드백 열람 · 마지막 활동 시각의 출처를 매핑한다. 출처가 없는 항목을 표시한다.
3. 추가 테이블 설계 (이름 분리: 접두어 또는 별도 스키마).
4. 집계 함수 SQL 초안: 호출자(`auth.uid()`)가 관리자 목록에 있는지 확인 → 담당 테스터만 → 집계 숫자만 반환.
5. 상태 판정 위치와 마이그레이션 관리 방식을 정해 DECISIONS 에 기록한다.
6. 설계안을 사용자에게 검토받는다.

## Acceptance Criteria

- 미션 7종과 마지막 활동 시각 각각에 출처(테이블 · 조건) 또는 "출처 없음 → 처리 방법"이 정해져 있다.
- 집계 함수가 원본 녹음 · 개인정보 없이 숫자만 반환하도록 설계되어 있다.
- 비관리자 호출이 거부되는 조건이 SQL 초안에 있다.
- 결정 사항이 DECISIONS 에 기록되어 있다.

## Verification

설계 단계이므로 실행 검증은 없다. SQL 초안의 실제 동작은 **UNVERIFIED** 로 남기고, 적용 Task 에서 [VERIFICATION.md](../../VERIFICATION.md) 의 Supabase 항목으로 확인한다.

## Related Files

- `src/lib/missions.ts` — `MissionCounts` 형태가 집계 함수 반환과 맞아야 한다
- `src/lib/supabase/server.ts`
- [domain/missions.md](../../domain/missions.md)

## Notes

- 받은 피드백 "열람 기록"이 앱 DB 에 없으면 앱 수정 없이는 자동 판정이 불가능하다 — 그 경우 수동 확인으로 대체할지 사용자에게 묻는다.
- 설문 데이터 출처(외부 폼 등)도 미정이다.

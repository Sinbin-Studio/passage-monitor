# PROGRESS

_Snapshot — 2026-11-03. 갱신 시 덮어쓴다._

## Current Phase

Phase 1 — 저작권 · 미션 탭 동작 중, 공지 탭 구현 (SQL · env 적용됨, 실제 게시 테스트 대기)

## Status

미션 탭은 PR #2 로 머지됐고 사용자가 DB 함수를 실행해 확인했다. 공지 탭 `/notices` 를 시안 A(목록 + 편집기 + 앱 미리보기)로 만들었다 (브랜치 `feat/notices`, PR #3). 예시 데이터로 화면을 확인했고, 사용자가 `monitor_notices.sql` 실행 · 스토어 링크 환경 변수 설정을 마쳤다. 권한 확인 함수 직접 호출도 막았다(`monitor_lock_admin_checks.sql` 적용됨). 실제 게시 · 고치기 · 지우기는 사용자가 테스트할 예정이다.

## Completed

- Next.js 16 + Supabase + Vitest 스택 셋업 ([TASK-000](tasks/completed/TASK-000-stack-setup.md))
- 저작권 탭: 재생 현황 · 재생 기록 · 정산 · 파일, 관리자 로그인, DB 함수 2개 (사용자가 실행함)
- 미션 탭 + 엑셀 받기 ([TASK-003](tasks/completed/TASK-003-mission-progress.md), PR #2)
- 공지 탭 코드: `src/lib/notices.ts`, `src/app/(admin)/notices/`, `supabase/monitor_notices.sql`, 메뉴 `공지`, `.env.example` 링크 2개

## In Progress

- [TASK-004](tasks/active/TASK-004-notices.md) 공지 탭 — 실제 게시 · 고치기 · 지우기 확인 대기
- [TASK-002](tasks/active/TASK-002-playback-admin.md) 재생 기록 관리 화면
- [TASK-001](tasks/active/TASK-001-db-schema-and-aggregation-design.md) Passage DB 스키마 파악 및 집계 함수 · 추가 테이블 설계

## Blocked

- 없음 (TASK-004 는 사용자 실제 게시 테스트 대기)

## Unverified

- 공지: 실제 게시 · 푸시, 고치기 때 푸시 재발송 없음, 지우기
- 저작권: 로그인 상태 `Date.now()` 오류 해소, 비관리자 거부, CSV 다운로드, Vercel 배포

## Current Active Task

[TASK-004](tasks/active/TASK-004-notices.md)

## Next Action

(SQL 실행 · 링크 env 설정됨) 공지 권한 계정으로 `/notices` 열어 목록 확인 → 안내 공지로 게시 · 고치기 · 지우기 실제 확인 → 커밋 · PR (사용자 요청 시).

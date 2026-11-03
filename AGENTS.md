# AGENTS.md — AI Coding Agent 작업 규약

Passage Beta Dashboard: Passage 베타테스터의 미션 수행 현황을 관리 업체가 웹에서 확인하는 Next.js 대시보드.

## Session Start

1. 이 파일을 읽는다.
2. [docs/PROGRESS.md](docs/PROGRESS.md) 로 현재 위치를 확인한다.
3. [docs/tasks/active/](docs/tasks/active/) 의 Active Task 를 확인한다.
4. [docs/README.md](docs/README.md) 를 Router 로 써서 **현재 Task 에 필요한 문서만** 읽는다.
5. 필요한 Source 만 연다.
6. 작업을 시작한다.

하지 않는다: Repository 전체 Scan, docs 전체 읽기, Architecture 재분석, [DECISIONS](docs/DECISIONS.md) 에 이미 있는 결정의 재결정, dependency 전체 재조사.

## Session End

1. 변경 내용을 확인한다.
2. [docs/VERIFICATION.md](docs/VERIFICATION.md) 에 따라 검증한다. 검증하지 못한 것은 UNVERIFIED 로 남긴다.
3. Active Task 상태를 갱신한다 (완료 시 `docs/tasks/completed/` 로 이동).
4. [docs/PROGRESS.md](docs/PROGRESS.md) 를 갱신한다 (Snapshot 이므로 덮어쓴다, 누적하지 않는다).
5. 새 결정 → DECISIONS, 실제 구조 변경 → ARCHITECTURE, 규칙 변경 → RULES.
6. Next Action 을 명확히 남긴다.

상태가 실제로 바뀐 문서만 갱신한다.

## 금지

- 근거 없는 Architecture 추론, 확인하지 않은 환경·DB 구조를 사실로 기록
- 검증 없이 완료 처리, 미래 계획을 현재 구현처럼 기록
- `.agent/` 생성·수정 (외부 도구가 관리하는 Machine-derived State 영역이며 Source of Truth 가 아니다)
- 사용자 요청 없이 commit / push

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# TASK-000 기술 스택 셋업

- **Task ID:** TASK-000
- **Status:** Completed (2026-10-19)
- **Goal:** 기획안의 기술 스택으로 저장소를 구성하고 GitHub `main` 에 push 한다.

## Result

- Next.js 16 + TypeScript + Tailwind CSS v4 + Supabase(`@supabase/ssr`) + Vitest 구성 ([D-001](../../DECISIONS.md#d-001))
- Supabase 브라우저 · 서버 · proxy 클라이언트, `src/proxy.ts` 세션 갱신
- `src/lib/missions.ts` 미션 기준 · 달성률 · 상태 판정 + 테스트 6개
- 확정 디자인 색상 토큰 · Gothic A1 글꼴
- README, `.github/COMMIT_CONVENTION.md`, `.github/PULL_REQUEST_TEMPLATE.md`
- 커밋 `bee3490` → `origin/main`

## Verification

`npm run lint`, `npm run typecheck`, `npm test` (6/6), `npm run build` 통과 (2026-10-19).

## Notes

- 기존 Vite 기본 파일은 교체했다.
- create-next-app 자동 커밋 `898eb5d` 가 커밋 규칙과 다르지만 기록 재작성은 하지 않았다.

# RULES

| Rule | Reason | Scope |
| --- | --- | --- |
| Next.js 코드를 쓰기 전 `node_modules/next/dist/docs/` 의 해당 가이드를 확인한다 | Next 16 은 이전 버전과 API·규칙이 다르다 (예: `middleware` → `proxy`) | `src/app`, `src/proxy.ts` |
| 제출 중 · 오류 문구 같은 잠깐 상태는 화면이 가려질 때 `useLayoutEffect` cleanup 으로 비운다 (`preserving-ui-state` 가이드) | `cacheComponents` 는 떠난 화면을 React `<Activity>` 로 숨겨 상태를 남긴다. 로그아웃 뒤 로그인 버튼이 "로그인 중…" 으로 멈췄다 (2026-11-03) | Client Component |
| 미션 기준·상태 판정은 `src/lib/missions.ts` 에만 둔다. 화면·쿼리는 이를 import 해서 쓴다 | 기준이 여러 곳에 흩어지면 집계 결과가 어긋난다 | 집계·UI |
| 재생 횟수 판정·집계·예상 금액은 `src/lib/playback.ts` 에만 두고, 바꿀 때 `playback.test.ts` 를 함께 고친다 | 정산 금액과 직결된다. 숫자가 부풀지 않는지 테스트로 지킨다 | 재생 기록 관리 |
| `lib/missions.ts` 는 순수 함수로 유지하고 변경 시 `missions.test.ts` 를 함께 고친다 | DB 없이 판정 로직을 검증할 수 있어야 한다 | `src/lib/missions*` |
| 서버용 Supabase 클라이언트는 요청마다 새로 만든다 | `@supabase/ssr` 가 쿠키·캐시 헤더를 요청 단위로 관리한다 | `src/lib/supabase` |
| service role key 를 쓰지 않는다. 권한은 DB 집계 함수에서 관리자 여부로 확인한다 | 키 유출이나 코드 실수가 전체 DB 노출로 이어지지 않게 한다 ([D-003](DECISIONS.md#d-003)) | 전체 |
| 대시보드로 가져오는 데이터는 집계 숫자와 화면에 필요한 최소 식별 정보로 한정한다 | 녹음·개인정보 노출 금지 | 쿼리·UI |
| 기존 Passage 테이블을 변경하지 않는다. 대시보드용 테이블·함수는 분리된 이름으로 추가하고 마이그레이션으로 남긴다 | 운영 중인 앱 DB 를 공유한다 | DB |
| `.env.local` 등 비밀값을 커밋하지 않는다. 새 환경 변수는 `.env.example` 에 추가한다 | 키 유출 방지 | 설정 |
| 커밋은 [.github/COMMIT_CONVENTION.md](../.github/COMMIT_CONVENTION.md) 형식(`type: 제목` + `- 변경사항`)을 따른다 | 팀 규칙 | Git |
| PR 제목은 `type: 제목`, 본문은 [PR 템플릿](../.github/PULL_REQUEST_TEMPLATE.md) 을 채운다 | 팀 규칙 | Git |
| 초기 셋업은 `main` 에 직접 커밋했다. 기능 작업의 브랜치/PR 운영 방식은 아직 정하지 않았다 — 사용자에게 확인한다 | 미확정 | Git |
| 사용자 요청 없이 commit / push 하지 않는다 | 사용자 결정 사항 | AI Agent |

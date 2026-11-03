# VERIFICATION

## 사용 가능한 명령

| 명령 | 내용 |
| --- | --- |
| `npm run lint` | ESLint (`eslint-config-next` core-web-vitals + typescript) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest 단위 테스트 (`src/**/*.test.ts`) |
| `npm run build` | 프로덕션 빌드 (타입 검사 포함) |
| `npm run dev` | 개발 서버, 화면 수동 확인 |

CI 는 없다. 모든 검증은 로컬에서 실행한다.

## 변경 종류별 검증

| 변경 | 검증 |
| --- | --- |
| `src/lib/missions.ts` | `npm test` → `npm run typecheck` |
| 그 외 Source (`src/**`) | 관련 test → `npm run lint` → `npm run build` |
| UI | 위 + `npm run dev` 로 화면 확인, 확정 디자인([D-004](DECISIONS.md#d-004))과 비교 |
| Dependency (`package.json`, lockfile) | `npm install` 후 lockfile 변경 확인 → `npm run build` → `npm test` |
| Config (`next.config.ts`, `tsconfig.json`, `eslint.config.mjs`) | `npm run build` → `npm run lint` |
| 환경 변수 | `.env.example` 갱신 여부 확인 → `npm run dev` 로 기동 확인 |
| Supabase 연동 · 집계 함수 · RLS | **UNVERIFIED** — 아래 참고 |

## 현재 검증할 수 없는 것 (UNVERIFIED)

- **Supabase 실제 연결:** 저장소에 `.env.local` 이 없어 실제 DB 접속을 확인한 적이 없다.
- **집계 함수 · 관리자 권한:** 아직 없다. 생기면 "관리자 계정은 담당 테스터 집계만 받고, 비관리자 계정은 거부된다"를 실제 계정 두 개로 확인해야 한다.
- **Vercel 배포:** 아직 배포하지 않았다.

## Invalidating Change

다음이 바뀌면 그에 묶인 검증 결과는 다시 확인해야 한다.

- `src/lib/missions.ts` 변경 → 미션 판정 테스트 결과
- `package-lock.json` · Node 버전 변경 → build / test 결과 전체
- Passage DB 스키마 · RLS 변경 → 집계 결과와 권한 검증
- `next.config.ts` 변경 → build 결과

# PROJECT

## Purpose

Passage 베타테스트 테스터들이 주어진 미션을 얼마나 수행했는지 관리 업체 담당자가 웹에서 확인하게 한다. 테스트 종료 후에는 참여율과 미션 수행률을 정량 결과로 정리할 수 있어야 한다.

## Motivation

테스터 활동을 사람이 일일이 확인하고 기록하는 운영 부담을 없앤다. 활동 데이터는 이미 Passage 앱의 Supabase DB에 있으므로 이를 재사용해 자동 집계한다.

## Target User / Workflow

| 사용자 | 하는 일 |
| --- | --- |
| 베타테스터 (일반 · 실력자 · 전문가) | 기존 Passage Flutter 앱만 사용한다. 이 대시보드에 접속하지 않는다. |
| 관리 업체 담당자 | 대시보드에 로그인해 담당 테스터의 미션 현황을 보고, 활동이 부족하거나 미완료인 테스터를 찾는다. |

## Scope (MVP)

모두 **Planned** 이다. 현재 구현 여부는 [PROGRESS.md](PROGRESS.md) 를 본다.

- 관리자 로그인
- 테스터 목록 조회, 유형별 필터
- 개인별 필수 미션 달성 현황
- 전체 및 유형별 참여 통계
- Supabase 활동 데이터 자동 집계
- 관리자 데이터 접근 권한 제한
- Vercel 배포

화면은 확정 디자인(현황 보드 메인 탭 + 미션 매트릭스 탭)을 따른다. 결정과 시안 위치는 [DECISIONS.md D-004](DECISIONS.md#d-004) 를 본다.

## Deferred (추가 검토)

업체별 담당 테스터 배정, 설문 제출 수동 확인 UI, 기간별 활동 추이 그래프, CSV 다운로드, 장기 미활동 알림, 실시간 갱신(Supabase Realtime).

## Out of Scope

- Passage 앱 자체의 기능 개발
- 녹음 원본·상세 음성 데이터 및 불필요한 개인정보 노출
- 테스터용 화면

## Current Capabilities

- **Current:** Next.js 앱 골격, Supabase 클라이언트 및 세션 갱신 proxy, 미션 기준·상태 판정 순수 함수(`src/lib/missions.ts`)와 단위 테스트. 화면 기능은 없다.

## Supported Platform

PC 브라우저 중심, 반응형. 배포 대상은 Vercel (**Planned**, 아직 배포하지 않음).

## Core Terminology

| 용어 | 의미 |
| --- | --- |
| 유형 | 일반 사용자(`general`) · 실력자(`skilled`) · 전문가(`expert`) |
| 필수 미션 | 달성률 계산에 들어가는 미션. 자율·조건부 미션은 제외 |
| 상태 | 미활동 · 진행 중 · 완료 · 확인 필요 |
| 재녹음 | 기존 녹음과 연결된 게시글로 올린 녹음 |
| 후속 피드백 | 재녹음 게시글에 단 댓글 |
| 관리 업체 담당자 | 대시보드 사용자. Supabase Auth 계정 + 관리자 등록 필요 |

미션별 기준과 상태 판정 규칙은 [domain/missions.md](domain/missions.md) 에 있다.

## Long-term Goal

베타테스트 기간 동안 실시간에 가까운 진행 현황을 제공하고, 종료 후 결과 보고의 근거 데이터가 된다.

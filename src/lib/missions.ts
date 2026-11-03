// 베타테스트 최종 미션 기준 (사용자 제공 표, 2026-10-31). 화면 · 엑셀의 판정은 모두 이 정의를 따른다.
// 실적(개수)은 DB 함수 monitor_mission_status() 가 센다. 세는 기준은 supabase/monitor_mission_status.sql 머리말.

/** Passage profiles.role 값 */
export type TesterRole = "user" | "skilled" | "expert";

export const ROLES: readonly TesterRole[] = ["user", "skilled", "expert"];

export const ROLE_LABEL: Record<TesterRole, string> = {
  user: "일반인",
  skilled: "실력자",
  expert: "전문가",
};

export type MissionKey = "firstUpload" | "comment" | "repractice" | "repracticeComment";

export const MISSIONS: readonly MissionKey[] = ["firstUpload", "comment", "repractice", "repracticeComment"];

export const MISSION_LABEL: Record<MissionKey, string> = {
  firstUpload: "최초 녹음 업로드",
  comment: "일반 게시글 코멘트",
  repractice: "재연습 업로드",
  repracticeComment: "재연습 글 코멘트",
};

/** 구분별 목표 개수. 0 = 해당 없는 미션. */
export const MISSION_GOALS: Record<TesterRole, Record<MissionKey, number>> = {
  user: { firstUpload: 2, comment: 0, repractice: 1, repracticeComment: 0 },
  skilled: { firstUpload: 2, comment: 5, repractice: 1, repracticeComment: 0 },
  expert: { firstUpload: 0, comment: 7, repractice: 0, repracticeComment: 3 },
};

export type MissionCounts = Record<MissionKey, number>;

export type MissionTester = {
  role: TesterRole;
  /** null = 닉네임 없음 */
  nickname: string | null;
  /** Google 메일, Apple 이면 "apple" */
  account: string;
  counts: MissionCounts;
};

export type MissionStatus = "done" | "inProgress" | "inactive";

export const MISSION_STATUS_LABEL: Record<MissionStatus, string> = {
  done: "완료",
  inProgress: "진행 중",
  inactive: "미활동",
};

export const NO_NICKNAME = "(닉네임 없음)";

export const nicknameOf = (t: MissionTester) => t.nickname ?? NO_NICKNAME;

/** 그 구분에 해당하는 미션만 */
export const missionsOf = (role: TesterRole) => MISSIONS.filter((k) => MISSION_GOALS[role][k] > 0);

/** 그 구분의 목표 개수 합 (일반인 3 · 실력자 8 · 전문가 10) */
export const goalTotal = (role: TesterRole) => MISSIONS.reduce((s, k) => s + MISSION_GOALS[role][k], 0);

export const isMet = (role: TesterRole, key: MissionKey, count: number) =>
  MISSION_GOALS[role][key] > 0 && count >= MISSION_GOALS[role][key];

/**
 * 진행률 = 미션마다 min(실적, 목표) 를 더해 목표 합으로 나눈 값. 목표를 넘긴 개수는 넣지 않는다.
 * 상태: 목표 전부 채움 = 완료, 목표 미션 실적이 하나라도 있으면 진행 중, 없으면 미활동.
 */
export function missionProgress(role: TesterRole, counts: MissionCounts) {
  let got = 0;
  for (const k of MISSIONS) got += Math.min(Math.max(counts[k], 0), MISSION_GOALS[role][k]);
  const need = goalTotal(role);
  const ratio = need > 0 ? got / need : 0;
  const status: MissionStatus = got >= need ? "done" : got > 0 ? "inProgress" : "inactive";
  return { got, need, ratio, percent: Math.round(ratio * 100), status };
}

const ROLE_ORDER: Record<TesterRole, number> = { user: 0, skilled: 1, expert: 2 };

/** 닉네임은 DB 정렬과 같게 글자 코드 순 (숫자 → 영문 대문자 → 소문자 → 한글) */
const byCode = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** 화면 순서: 구분 → 미완료 먼저 → 진행률 낮은 순 → 닉네임 */
export function compareForScreen(a: MissionTester, b: MissionTester) {
  const pa = missionProgress(a.role, a.counts);
  const pb = missionProgress(b.role, b.counts);
  return (
    ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
    Number(pa.status === "done") - Number(pb.status === "done") ||
    pa.ratio - pb.ratio ||
    byCode(nicknameOf(a), nicknameOf(b))
  );
}

/** 엑셀 순서: 구분 → 진행률 높은 순 → 닉네임 */
export function compareForExport(a: MissionTester, b: MissionTester) {
  return (
    ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
    missionProgress(b.role, b.counts).ratio - missionProgress(a.role, a.counts).ratio ||
    byCode(nicknameOf(a), nicknameOf(b))
  );
}

/** 구분별 인원 · 완료 인원 */
export function roleSummary(testers: readonly MissionTester[], role: TesterRole) {
  const list = testers.filter((t) => t.role === role);
  const done = list.filter((t) => missionProgress(t.role, t.counts).status === "done").length;
  return { total: list.length, done };
}

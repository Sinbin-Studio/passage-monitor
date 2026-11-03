// 재생 횟수 세는 기준 (2026-10-30 사용자 결정). 재생 현황 · 정산 · 파일의 숫자는 모두 이 정의를 따른다.
//
// 항상 적용 (끌 수 없음):
// - 1초라도 재생되면 1번 (KOMCA 기준). 최소 청취 시간 조건은 없다.
// - 일시정지 · 댓글 시간 탭 · 위치 이동은 같은 재생 안에서 일어나므로 새로 세지 않는다 (앱이 새 재생을 만들지 않음).
// - 같은 게시글 안에서 다시 재생한 것은 뺀다. 앞 재생의 끝 기록이 없어도 뺀다.
// 고를 수 있는 조건은 PlaybackRules 를 본다.

/** 앞 재생과의 관계. Passage `playback_session_facts.prev_relation` 과 같은 값 */
export type PrevRelation =
  | "none"
  | "same_visit"
  | "reentry_same_post"
  | "other_screen";

/** 어디서 들었나. `post_detail` = 게시글 화면, `song_history_sheet` = "이 곡의 기록" 시트 */
export type PlaySource = "post_detail" | "song_history_sheet";

/** `playback_session_facts` 한 행 중 계산에 쓰는 값만 */
export type PlaybackFact = {
  sessionId: string;
  recordingId: string;
  songKey: string;
  /** 올린 사람이 직접 들었는지. null = 알 수 없음 */
  isOwn: boolean | null;
  source: PlaySource;
  prevRelation: PrevRelation;
  /** 앞 재생 시작 → 이번 재생 시작 (ms). 앞 재생이 없으면 null */
  gapStartToStartMs: number | null;
  /** 앞 재생 끝 → 이번 재생 시작 (ms). 앞 재생의 끝 기록이 없으면 null */
  gapEndToStartMs: number | null;
  /** 재생 시작 시각 (ISO). 파일 받기 "재생 하나씩" 에만 쓴다 */
  startedAt?: string;
};

export type PlaybackRules = {
  /** "이 곡의 기록" 시트에서 미리 들은 것 빼기 */
  excludeSheet: boolean;
  /** 자기 녹음을 직접 들은 것 빼기 */
  excludeOwn: boolean;
  /** 나갔다 같은 게시글에 다시 들어와서 들은 것 빼기 */
  excludeReentry: boolean;
  /** 같은 녹음을 짧은 시간 안에 또 들은 것 빼기 */
  excludeRepeat: boolean;
  repeatWithinSec: number;
  /** 시간을 재는 기준. prev_end = 앞 재생이 끝난 뒤, prev_start = 앞 재생 시작 뒤 */
  repeatFrom: "prev_end" | "prev_start";
};

export const REPEAT_SEC_OPTIONS = [5, 10, 30, 60] as const;

/** 시안 기본값 (Claude 가 정함, 사용자 미확정) */
export const DEFAULT_RULES: PlaybackRules = {
  excludeSheet: false,
  excludeOwn: true,
  excludeReentry: false,
  excludeRepeat: true,
  repeatWithinSec: 10,
  repeatFrom: "prev_end",
};

export type ExcludeReason = "replay" | "sheet" | "own" | "reentry" | "repeat";

export const EXCLUDE_REASON_LABEL: Record<ExcludeReason, string> = {
  replay: "같은 게시글 안 다시 재생",
  sheet: '"이 곡의 기록" 시트에서 들은 것',
  own: "자기 녹음을 직접 들은 것",
  reentry: "나갔다 들어와서 들은 것",
  repeat: "빠르게 다시 들은 것",
};

/**
 * - counted: 정산 대상
 * - excluded: 제외 기준에 하나라도 해당
 * - check: 제외 기준에 해당하지 않지만, 켜 둔 조건을 판단할 기록이 빠져 있음 (확인 필요)
 */
export type PlayStatus = "counted" | "excluded" | "check";

/** 확인 필요가 된 까닭: 켜 둔 조건을 판단할 값이 빠졌다 */
export type MissingInfo = "own" | "repeat";

export const MISSING_INFO_LABEL: Record<MissingInfo, string> = {
  own: "올린 사람인지 알 수 없음",
  repeat: "앞 재생 끝난 시각 없음",
};

export type PlayJudgement = {
  status: PlayStatus;
  reasons: ExcludeReason[];
  /** 빠진 값. 제외 사유가 있으면 상태는 제외지만, 빠진 값은 그대로 적는다 */
  missing: MissingInfo[];
};

export function judgePlay(fact: PlaybackFact, rules: PlaybackRules): PlayJudgement {
  const reasons: ExcludeReason[] = [];
  const missing: MissingInfo[] = [];

  if (fact.prevRelation === "same_visit") reasons.push("replay");
  if (rules.excludeSheet && fact.source === "song_history_sheet") reasons.push("sheet");
  if (rules.excludeOwn) {
    if (fact.isOwn === true) reasons.push("own");
    else if (fact.isOwn === null) missing.push("own");
  }
  if (rules.excludeReentry && fact.prevRelation === "reentry_same_post") reasons.push("reentry");
  if (rules.excludeRepeat && fact.prevRelation !== "none") {
    const gap = rules.repeatFrom === "prev_end" ? fact.gapEndToStartMs : fact.gapStartToStartMs;
    // 음수(앞 재생과 겹침)도 "짧은 시간 안" 으로 본다.
    if (gap === null) missing.push("repeat");
    else if (gap <= rules.repeatWithinSec * 1000) reasons.push("repeat");
  }

  if (reasons.length > 0) return { status: "excluded", reasons, missing };
  return { status: missing.length > 0 ? "check" : "counted", reasons, missing };
}

export type PlayTotals = {
  /** 앱 기록 그대로 */
  raw: number;
  counted: number;
  excluded: number;
  check: number;
};

export type PlaybackGroupBy = "song" | "recording";

export type PlaybackRow = PlayTotals & {
  key: string;
  /** 곡별: 녹음 수, 녹음별: 0 */
  recordingCount: number;
  /** 녹음별일 때 그 녹음의 곡 */
  songKey: string;
};

export type PlaybackSummary = {
  totals: PlayTotals;
  /** 사유별 해당 건수. 한 재생이 여러 사유에 해당하면 각각 센다 */
  reasonHits: Record<ExcludeReason, number>;
  /** 정산 대상 많은 순 */
  rows: PlaybackRow[];
};

export function summarizePlays(
  facts: readonly PlaybackFact[],
  rules: PlaybackRules,
  groupBy: PlaybackGroupBy,
): PlaybackSummary {
  const totals: PlayTotals = { raw: 0, counted: 0, excluded: 0, check: 0 };
  const reasonHits: Record<ExcludeReason, number> = {
    replay: 0,
    sheet: 0,
    own: 0,
    reentry: 0,
    repeat: 0,
  };
  const groups = new Map<string, PlaybackRow & { recordings: Set<string> }>();

  for (const fact of facts) {
    const { status, reasons } = judgePlay(fact, rules);
    for (const r of reasons) reasonHits[r]++;

    const key = groupBy === "song" ? fact.songKey : fact.recordingId;
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        songKey: fact.songKey,
        recordingCount: 0,
        raw: 0,
        counted: 0,
        excluded: 0,
        check: 0,
        recordings: new Set(),
      };
      groups.set(key, g);
    }
    g.recordings.add(fact.recordingId);

    totals.raw++;
    totals[status]++;
    g.raw++;
    g[status]++;
  }

  const rows = [...groups.values()]
    .map(({ recordings, ...row }) => ({
      ...row,
      recordingCount: groupBy === "song" ? recordings.size : 0,
    }))
    .sort((a, b) => b.counted - a.counted || b.raw - a.raw || a.key.localeCompare(b.key));

  return { totals, reasonHits, rows };
}

/** "1.3" 같은 단가 문자열 → 숫자. 비었거나 0 이하 · 숫자가 아니면 null. */
export function parseWonPerPlay(value: string | undefined): number | null {
  const n = Number(value?.trim());
  return value?.trim() && Number.isFinite(n) && n > 0 ? n : null;
}

/** 예상 계산안 단가(1회 몇 원). 저장소에 두지 않고 환경 변수로 넣는다 (.env.example). 없으면 null. */
export const ESTIMATE_WON_PER_PLAY = parseWonPerPlay(process.env.NEXT_PUBLIC_ESTIMATE_WON_PER_PLAY);

/**
 * 재생 수 × 단가를 0.1원 단위로 계산한다. 정산 확정 금액이 아니다.
 * 소수 오차를 피하려고 0.1원 단위 정수로 곱한 뒤 나눈다.
 */
export function estimateWon(plays: number, wonPerPlay: number): number {
  const tenths = Math.round(wonPerPlay * 10);
  return (plays * tenths) / 10;
}

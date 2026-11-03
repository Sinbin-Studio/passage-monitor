// 표 · 파일로 내보낼 행. 재생 현황 CSV 와 정산 · 파일 화면이 같이 쓴다. 순수 함수.

import type { CsvCell } from "./csv";
import {
  EXCLUDE_REASON_LABEL,
  judgePlay,
  summarizePlays,
  type PlaybackFact,
  type PlaybackRules,
  type PlaySource,
  type PlayStatus,
  type PrevRelation,
} from "./playback";

export type ExportUnit = "song" | "recording" | "play";

export const EXPORT_UNIT_LABEL: Record<ExportUnit, string> = {
  song: "곡별",
  recording: "녹음별",
  play: "재생 하나씩",
};

const SOURCE_LABEL: Record<PlaySource, string> = {
  post_detail: "게시글 화면",
  song_history_sheet: '"이 곡의 기록" 시트',
};

const RELATION_LABEL: Record<PrevRelation, string> = {
  none: "없음",
  same_visit: "같은 게시글 안",
  reentry_same_post: "나갔다 들어옴",
  other_screen: "다른 화면",
};

const STATUS_LABEL: Record<PlayStatus, string> = {
  counted: "정산 대상",
  excluded: "제외",
  check: "확인 필요",
};

/** ISO 시각 → 한국 시간 "YYYY-MM-DD HH:mm:ss" */
export function kstDateTime(iso: string): string {
  const k = new Date(new Date(iso).getTime() + 9 * 3_600_000).toISOString();
  return `${k.slice(0, 10)} ${k.slice(11, 19)}`;
}

/** 녹음 · 곡 이름을 붙인 내보내기 표 (머리줄 + 행) */
export function exportTable(
  facts: readonly PlaybackFact[],
  rules: PlaybackRules,
  unit: ExportUnit,
  songTitle: Record<string, string>,
): { header: string[]; rows: CsvCell[][] } {
  const song = (key: string) => songTitle[key] ?? key;

  if (unit === "play") {
    return {
      header: ["재생 ID", "시작 (한국 시간)", "녹음", "곡", "어디서", "앞 재생", "결과", "제외 사유"],
      rows: facts.map((f) => {
        const j = judgePlay(f, rules);
        return [
          f.sessionId,
          f.startedAt ? kstDateTime(f.startedAt) : "",
          f.recordingId,
          song(f.songKey),
          SOURCE_LABEL[f.source],
          RELATION_LABEL[f.prevRelation],
          STATUS_LABEL[j.status],
          j.reasons.map((r) => EXCLUDE_REASON_LABEL[r]).join(" / "),
        ];
      }),
    };
  }

  const { rows } = summarizePlays(facts, rules, unit);
  const counts = (r: (typeof rows)[number]) => [r.counted, r.raw, r.excluded, r.check];
  return unit === "song"
    ? {
        header: ["곡", "녹음 수", "정산 대상", "전체 재생", "제외", "확인 필요"],
        rows: rows.map((r) => [song(r.songKey), r.recordingCount, ...counts(r)]),
      }
    : {
        header: ["녹음", "곡", "정산 대상", "전체 재생", "제외", "확인 필요"],
        rows: rows.map((r) => [r.key, song(r.songKey), ...counts(r)]),
      };
}

/** 지금 켜 둔 제외 기준을 짧은 말로 (화면 · 파일 맨 윗줄용) */
export function rulesSummary(rules: PlaybackRules): string[] {
  const out: string[] = [];
  if (rules.excludeSheet) out.push('"이 곡의 기록" 시트 뺌');
  if (rules.excludeOwn) out.push("자기 녹음 뺌");
  if (rules.excludeReentry) out.push("나갔다 들어옴 뺌");
  if (rules.excludeRepeat) {
    out.push(`${rules.repeatFrom === "prev_end" ? "앞 재생 끝" : "앞 재생 시작"} ${rules.repeatWithinSec}초 안 또 들음 뺌`);
  }
  return out;
}

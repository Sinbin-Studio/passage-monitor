// DB 함수 monitor_playback_facts() 의 행 → 계산용 PlaybackFact. 순수 함수.
// SQL: supabase/monitor_playback_admin.sql

import type { PlaybackFact, PlaySource, PrevRelation } from "./playback";

export type PlaybackFactRow = {
  playback_id: string;
  post_id: string;
  song_id: string | null;
  song_title: string | null;
  artist: string | null;
  is_own: boolean | null;
  source: string;
  started_at: string;
  prev_relation: string;
  gap_start_to_start_ms: number | null;
  gap_end_to_start_ms: number | null;
};

/** 곡이 연결되지 않은 재생을 묶는 키 */
export const UNLINKED_SONG_KEY = "unlinked";

const SOURCES: readonly PlaySource[] = ["post_detail", "song_history_sheet"];
const RELATIONS: readonly PrevRelation[] = ["none", "same_visit", "reentry_same_post", "other_screen"];

export function factsFromRows(rows: readonly PlaybackFactRow[]): {
  facts: PlaybackFact[];
  songTitle: Record<string, string>;
} {
  const songTitle: Record<string, string> = {};
  const facts = rows.map((r) => {
    // DB 제약으로 막혀 있지만, 모르는 값이 오면 조용히 세지 않고 바로 드러나게 한다.
    if (!SOURCES.includes(r.source as PlaySource)) throw new Error(`알 수 없는 source: ${r.source}`);
    if (!RELATIONS.includes(r.prev_relation as PrevRelation)) {
      throw new Error(`알 수 없는 prev_relation: ${r.prev_relation}`);
    }

    const songKey = r.song_id ?? UNLINKED_SONG_KEY;
    if (!(songKey in songTitle)) {
      songTitle[songKey] = r.song_id
        ? [r.song_title, r.artist].filter(Boolean).join(" — ") || "곡 이름 없음"
        : "곡 연결 없음";
    }

    return {
      sessionId: r.playback_id,
      recordingId: r.post_id,
      songKey,
      isOwn: r.is_own,
      source: r.source as PlaySource,
      prevRelation: r.prev_relation as PrevRelation,
      gapStartToStartMs: r.gap_start_to_start_ms,
      gapEndToStartMs: r.gap_end_to_start_ms,
      startedAt: r.started_at,
    };
  });
  return { facts, songTitle };
}

/** "2026-10" → 한국 시간 그 달 1일 0시 ~ 다음 달 1일 0시. 형식이 틀리면 null */
export function kstMonthRange(month: string): { from: string; to: string } | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const next = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
  return { from: `${month}-01T00:00:00+09:00`, to: `${next}-01T00:00:00+09:00` };
}

/** 앞뒤 달 "YYYY-MM" */
export function shiftMonth(month: string, delta: number): string {
  const [y, mo] = month.split("-").map(Number);
  const i = y * 12 + (mo - 1) + delta;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;
}

/** 지금의 한국 시간 "YYYY-MM" */
export function currentKstMonth(now: Date): string {
  return new Date(now.getTime() + 9 * 3_600_000).toISOString().slice(0, 7);
}

// 예시 데이터. Supabase 연결 정보가 없을 때 화면 확인용으로만 쓴다.
// 시안(재생 현황)과 같은 숫자가 나오도록 같은 시드 · 같은 순서로 만든다.

import type { PlaybackFact, PrevRelation } from "@/lib/playback";
import type { TimelineData, TimelineEventRow, TimelineSessionRow } from "@/lib/playback-timeline";

export const SAMPLE_SONG_TITLE: Record<string, string> = {
  A: "곡 A — 가수 A",
  B: "곡 B — 가수 B",
  C: "곡 C — 가수 C",
  D: "곡 D — 가수 D",
  E: "곡 E — 가수 E",
  F: "곡 F — 가수 F",
};

const RECORDINGS = [
  { id: "R-0142", song: "A", weight: 22 },
  { id: "R-0163", song: "B", weight: 16 },
  { id: "R-0171", song: "C", weight: 14 },
  { id: "R-0188", song: "D", weight: 12 },
  { id: "R-0204", song: "E", weight: 11 },
  { id: "R-0157", song: "A", weight: 9 },
  { id: "R-0193", song: "B", weight: 8 },
  { id: "R-0219", song: "F", weight: 8 },
];

export function sampleFacts(): PlaybackFact[] {
  let seed = 20261030;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const totalWeight = RECORDINGS.reduce((a, b) => a + b.weight, 0);
  const facts: PlaybackFact[] = [];

  for (let i = 0; i < 1284; i++) {
    let x = rand() * totalWeight;
    let rec = RECORDINGS[RECORDINGS.length - 1];
    for (const c of RECORDINGS) {
      if (x < c.weight) {
        rec = c;
        break;
      }
      x -= c.weight;
    }
    const u = rand();
    const prevRelation: PrevRelation =
      u < 0.52 ? "none" : u < 0.72 ? "same_visit" : u < 0.87 ? "reentry_same_post" : "other_screen";
    const prevEnded = prevRelation === "none" ? false : rand() < 0.08 ? false : (rand(), true);
    const gv = rand();
    const gapStart =
      prevRelation === "none"
        ? null
        : Math.round(gv < 0.3 ? rand() * 9000 : gv < 0.65 ? 9000 + rand() * 60000 : 69000 + rand() * 3000000);
    const gapEnd = gapStart === null || !prevEnded ? null : Math.round(gapStart * (0.05 + rand() * 0.6));
    const ownR = rand();

    facts.push({
      sessionId: `S-${String(i + 1).padStart(5, "0")}`,
      recordingId: rec.id,
      songKey: rec.song,
      isOwn: ownR < 0.05 ? true : ownR < 0.06 ? null : false,
      source: rand() < 0.78 ? "post_detail" : "song_history_sheet",
      prevRelation,
      gapStartToStartMs: gapStart,
      gapEndToStartMs: gapEnd,
    });
  }
  return facts;
}

// 재생 기록 화면 예시 (녹음 R-0142 만). 시안의 p_7f3a 흐름과 같다.

export const SAMPLE_TIMELINE_POST = "R-0142";

export function sampleTimeline(postId: string): TimelineData {
  if (postId !== SAMPLE_TIMELINE_POST) return { sessions: [], events: [] };
  const L = ["7f3a", "09c1", "b218"].map((h, i) => `${h}0000-0000-0000-0000-00000000000${i}`);
  const s = (p: Partial<TimelineSessionRow>): TimelineSessionRow => ({
    playback_id: "x",
    post_id: postId,
    song_id: "A",
    song_title: "곡 A",
    artist: "가수 A",
    is_own: false,
    source: "post_detail",
    started_at: "",
    prev_relation: "none",
    gap_start_to_start_ms: null,
    gap_end_to_start_ms: null,
    listener_id: L[0],
    nickname: "노래하는고양이",
    account_exists: true,
    visit_id: "v1",
    visit_post_id: postId,
    ended_at: null,
    end_type: "complete",
    prev_end_type: null,
    gap_exit_to_reenter_ms: null,
    ...p,
  });
  const e = (event_type: string, t: string, visit_id: string, playback_id: string | null = null, extra: Partial<TimelineEventRow> = {}): TimelineEventRow => ({
    event_type,
    occurred_at: `${t}Z`,
    visit_id,
    playback_id,
    post_id: postId,
    position_ms: null,
    seek_from_ms: null,
    ...extra,
  });
  return {
    sessions: [
      s({ playback_id: "a1", started_at: "2026-10-14T05:02:14Z" }),
      s({ playback_id: "a2", started_at: "2026-10-14T05:05:55Z", end_type: "stop", prev_relation: "same_visit", gap_start_to_start_ms: 221_000, gap_end_to_start_ms: 3_000, prev_end_type: "complete" }),
      s({ playback_id: "a3", visit_id: "v2", started_at: "2026-10-14T05:13:33Z", end_type: null, prev_relation: "reentry_same_post", gap_start_to_start_ms: 458_000, gap_end_to_start_ms: 313_000, gap_exit_to_reenter_ms: 222_000 }),
      s({ playback_id: "a4", visit_id: "v3", visit_post_id: "R-0157", source: "song_history_sheet", started_at: "2026-10-14T05:20:40Z", end_type: "stop", prev_relation: "other_screen", gap_start_to_start_ms: 427_000, gap_end_to_start_ms: null }),
      s({ playback_id: "b1", listener_id: L[1], nickname: "새벽감성", visit_id: "w1", started_at: "2026-10-15T11:00:05Z" }),
      s({ playback_id: "b2", listener_id: L[1], nickname: "새벽감성", visit_id: "w2", started_at: "2026-10-16T12:30:00Z", prev_relation: "reentry_same_post", gap_start_to_start_ms: 91_000_000, gap_end_to_start_ms: 90_800_000, gap_exit_to_reenter_ms: 90_700_000 }),
      s({ playback_id: "c1", listener_id: L[2], nickname: null, visit_id: "u1", is_own: true, started_at: "2026-10-12T09:00:00Z" }),
    ],
    events: [
      e("visit_enter", "2026-10-14T05:02:10", "v1"),
      e("play_start", "2026-10-14T05:02:14", "v1", "a1"),
      e("pause", "2026-10-14T05:03:01", "v1", "a1"),
      e("resume", "2026-10-14T05:03:40", "v1", "a1"),
      e("complete", "2026-10-14T05:05:52", "v1", "a1"),
      e("play_start", "2026-10-14T05:05:55", "v1", "a2"),
      e("seek", "2026-10-14T05:06:30", "v1", "a2", { seek_from_ms: 35_000, position_ms: 80_000 }),
      e("stop", "2026-10-14T05:08:20", "v1", "a2"),
      e("visit_exit", "2026-10-14T05:09:48", "v1"),
      e("visit_enter", "2026-10-14T05:13:30", "v2"),
      e("play_start", "2026-10-14T05:13:33", "v2", "a3"),
      e("progress", "2026-10-14T05:14:05", "v2", "a3"),
      e("visit_enter", "2026-10-14T05:20:02", "v3", null, { post_id: "R-0157" }),
      e("play_start", "2026-10-14T05:20:40", "v3", "a4"),
      e("stop", "2026-10-14T05:21:58", "v3", "a4"),
      e("visit_exit", "2026-10-14T05:22:15", "v3", null, { post_id: "R-0157" }),
      e("visit_enter", "2026-10-15T11:00:01", "w1"),
      e("play_start", "2026-10-15T11:00:05", "w1", "b1"),
      e("complete", "2026-10-15T11:03:10", "w1", "b1"),
      e("visit_exit", "2026-10-15T11:03:30", "w1"),
      e("visit_enter", "2026-10-16T12:29:55", "w2"),
      e("play_start", "2026-10-16T12:30:00", "w2", "b2"),
      e("complete", "2026-10-16T12:33:05", "w2", "b2"),
      e("visit_exit", "2026-10-16T12:33:20", "w2"),
      e("visit_enter", "2026-10-12T08:59:58", "u1"),
      e("play_start", "2026-10-12T09:00:00", "u1", "c1"),
      e("complete", "2026-10-12T09:03:05", "u1", "c1"),
      e("visit_exit", "2026-10-12T09:03:10", "u1"),
    ],
  };
}

import { describe, expect, it } from "vitest";

import { DEFAULT_RULES } from "./playback";
import {
  durationLabel,
  listenerCode,
  listenerLabel,
  listenerSummaries,
  listenerTimeline,
  type TimelineData,
  type TimelineEventRow,
  type TimelineSessionRow,
} from "./playback-timeline";

const POST = "post-0142";
const OTHER = "post-0157";
const L1 = "7f3a0000-0000-0000-0000-000000000001";
const L2 = "b2180000-0000-0000-0000-000000000002";

const session = (p: Partial<TimelineSessionRow>): TimelineSessionRow => ({
  playback_id: "p",
  post_id: POST,
  song_id: "song",
  song_title: "곡",
  artist: "가수",
  is_own: false,
  source: "post_detail",
  started_at: "2026-10-14T05:02:14Z",
  prev_relation: "none",
  gap_start_to_start_ms: null,
  gap_end_to_start_ms: null,
  listener_id: L1,
  nickname: "듣는사람",
  account_exists: true,
  visit_id: "v1",
  visit_post_id: POST,
  ended_at: null,
  end_type: "complete",
  prev_end_type: null,
  gap_exit_to_reenter_ms: null,
  ...p,
});

const ev = (event_type: string, occurred_at: string, visit_id: string, playback_id: string | null = null, extra: Partial<TimelineEventRow> = {}): TimelineEventRow => ({
  event_type,
  occurred_at: `2026-10-14T05:${occurred_at}Z`,
  visit_id,
  playback_id,
  post_id: POST,
  position_ms: null,
  seek_from_ms: null,
  ...extra,
});

// 시안 "재생 기록" 의 p_7f3a 흐름
const data: TimelineData = {
  sessions: [
    session({ playback_id: "a", started_at: "2026-10-14T05:02:14Z" }),
    session({ playback_id: "b", started_at: "2026-10-14T05:05:55Z", end_type: "stop", prev_relation: "same_visit", gap_start_to_start_ms: 221_000, gap_end_to_start_ms: 3_000, prev_end_type: "complete" }),
    session({ playback_id: "c", visit_id: "v2", started_at: "2026-10-14T05:13:33Z", end_type: null, prev_relation: "reentry_same_post", gap_start_to_start_ms: 458_000, gap_end_to_start_ms: 313_000, gap_exit_to_reenter_ms: 222_000 }),
    session({ playback_id: "d", visit_id: "v3", visit_post_id: OTHER, source: "song_history_sheet", started_at: "2026-10-14T05:20:40Z", end_type: "stop", prev_relation: "other_screen", gap_start_to_start_ms: 427_000, gap_end_to_start_ms: null }),
    session({ playback_id: "e", listener_id: L2, nickname: "올린사람", visit_id: "v9", is_own: true }),
  ],
  events: [
    ev("visit_enter", "02:10", "v1"),
    ev("play_start", "02:14", "v1", "a"),
    ev("pause", "03:01", "v1", "a"),
    ev("resume", "03:40", "v1", "a"),
    ev("complete", "05:52", "v1", "a"),
    ev("play_start", "05:55", "v1", "b"),
    ev("seek", "06:30", "v1", "b", { seek_from_ms: 35_000, position_ms: 80_000 }),
    ev("stop", "08:20", "v1", "b"),
    ev("visit_exit", "09:48", "v1"),
    ev("visit_enter", "13:30", "v2"),
    ev("play_start", "13:33", "v2", "c"),
    ev("progress", "14:05", "v2", "c"),
    ev("visit_enter", "20:02", "v3", null, { post_id: OTHER }),
    ev("play_start", "20:40", "v3", "d"),
    ev("stop", "21:58", "v3", "d"),
    ev("visit_exit", "22:15", "v3", null, { post_id: OTHER }),
  ],
};

describe("listenerSummaries", () => {
  it("들은 사람마다 전체 → 정산 대상, 올린 사람 표시", () => {
    const l = listenerSummaries(data, DEFAULT_RULES);
    expect(l.map((x) => [x.label, x.raw, x.counted, x.excluded, x.check, x.isOwn])).toEqual([
      ["듣는사람", 4, 2, 1, 1, false],
      ["올린사람", 1, 0, 1, 0, true],
    ]);
  });
});

describe("listenerTimeline", () => {
  const { visits, plays } = listenerTimeline(data, L1, DEFAULT_RULES);

  it("방문 3개, 다른 게시글 방문은 samePost=false", () => {
    expect(visits.map((v) => [v.visitId, v.samePost])).toEqual([["v1", true], ["v2", true], ["v3", false]]);
  });

  it("방문 안 흐름: 들어옴 → 재생 → … → 나감, 위치 이동은 앞뒤 위치", () => {
    expect(visits[0].items.map((i) => i.label)).toEqual([
      "들어옴", "재생 1", "일시정지", "이어 듣기", "끝까지 들음", "재생 2", "위치 이동", "멈춤", "나감",
    ]);
    expect(visits[0].items[6].note).toBe("0:35 → 1:20");
  });

  it("끝 기록이 없는 재생은 마지막 이벤트 뒤에 '끝 기록 없음'", () => {
    expect(visits[1].items.map((i) => i.label)).toEqual(["들어옴", "재생 3", "듣는 중", "재생 3 끝 기록 없음"]);
  });

  it("시트에서 들은 재생에 표시", () => {
    expect(visits[2].items[1]).toMatchObject({ label: "재생 4", note: '"이 곡의 기록" 시트' });
  });

  it("재생별 결과와 설명", () => {
    expect(plays.map((p) => [p.no, p.prevText, p.judgement.status, p.note])).toEqual([
      [1, "없음 (첫 재생)", "counted", ""],
      [2, "같은 방문 · 앞 재생 끝나고 3초 뒤", "excluded", "같은 게시글 안 다시 재생 / 빠르게 다시 들은 것"],
      [3, "나갔다 3분 42초 뒤 다시 들어옴", "counted", "끝 기록 없어도 셈"],
      [4, "다른 화면 · 앞 재생 끝 기록 없음", "check", "앞 재생 끝난 시각 없음"],
    ]);
  });
});

it("닉네임이 없거나 탈퇴했으면 상태 + 가명", () => {
  expect(listenerLabel({ listener_id: L1, nickname: null, account_exists: true })).toBe("닉네임 없음 (p_7f3a)");
  expect(listenerLabel({ listener_id: L1, nickname: null, account_exists: false })).toBe("탈퇴한 사용자 (p_7f3a)");
});

it("durationLabel · listenerCode", () => {
  expect(durationLabel(3_000)).toBe("3초");
  expect(durationLabel(120_000)).toBe("2분");
  expect(durationLabel(3_725_000)).toBe("1시간 2분");
  expect(listenerCode(L1)).toBe("p_7f3a");
});

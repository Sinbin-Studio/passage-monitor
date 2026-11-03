import { describe, expect, it } from "vitest";

import { currentKstMonth, factsFromRows, kstMonthRange, shiftMonth, type PlaybackFactRow } from "./playback-rows";

const row = (p: Partial<PlaybackFactRow> = {}): PlaybackFactRow => ({
  playback_id: "p1",
  post_id: "post1",
  song_id: "song1",
  song_title: "제목",
  artist: "가수",
  is_own: false,
  source: "post_detail",
  started_at: "2026-10-01T00:00:00Z",
  prev_relation: "none",
  gap_start_to_start_ms: null,
  gap_end_to_start_ms: null,
  ...p,
});

describe("factsFromRows", () => {
  it("행을 계산용 값으로 바꾸고 곡 이름을 모은다", () => {
    const { facts, songTitle } = factsFromRows([
      row(),
      row({ playback_id: "p2", song_id: null, song_title: null, artist: null, is_own: null }),
    ]);
    expect(facts[0]).toMatchObject({ sessionId: "p1", recordingId: "post1", songKey: "song1", isOwn: false });
    expect(facts[1]).toMatchObject({ songKey: "unlinked", isOwn: null });
    expect(songTitle).toEqual({ song1: "제목 — 가수", unlinked: "곡 연결 없음" });
  });

  it("모르는 source · prev_relation 은 오류로 드러낸다", () => {
    expect(() => factsFromRows([row({ source: "x" })])).toThrow();
    expect(() => factsFromRows([row({ prev_relation: "x" })])).toThrow();
  });
});

describe("월 계산", () => {
  it("한국 시간 기준 달 범위", () => {
    expect(kstMonthRange("2026-12")).toEqual({ from: "2026-12-01T00:00:00+09:00", to: "2027-01-01T00:00:00+09:00" });
    expect(kstMonthRange("2026-13")).toBeNull();
    expect(kstMonthRange("abc")).toBeNull();
  });

  it("앞뒤 달", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });

  it("UTC 15시 이후는 한국 다음 날", () => {
    expect(currentKstMonth(new Date("2026-10-31T15:00:00Z"))).toBe("2026-11");
    expect(currentKstMonth(new Date("2026-10-31T14:59:59Z"))).toBe("2026-10");
  });
});

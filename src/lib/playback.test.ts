import { describe, expect, it } from "vitest";

import {
  DEFAULT_RULES,
  estimateWon,
  parseWonPerPlay,
  judgePlay,
  summarizePlays,
  type PlaybackFact,
  type PlaybackRules,
} from "./playback";

const ALL_OFF: PlaybackRules = {
  ...DEFAULT_RULES,
  excludeSheet: false,
  excludeOwn: false,
  excludeReentry: false,
  excludeRepeat: false,
};

let seq = 0;
const play = (p: Partial<PlaybackFact> = {}): PlaybackFact => ({
  sessionId: `s${++seq}`,
  recordingId: "R-1",
  songKey: "A",
  isOwn: false,
  source: "post_detail",
  prevRelation: "none",
  gapStartToStartMs: null,
  gapEndToStartMs: null,
  ...p,
});

describe("judgePlay — 항상 적용", () => {
  it("처음 재생은 1번으로 센다", () => {
    expect(judgePlay(play(), ALL_OFF).status).toBe("counted");
  });

  it("같은 게시글 안 다시 재생은 조건을 모두 꺼도 뺀다", () => {
    const j = judgePlay(play({ prevRelation: "same_visit", gapStartToStartMs: 600_000, gapEndToStartMs: 300_000 }), ALL_OFF);
    expect(j).toEqual({ status: "excluded", reasons: ["replay"], missing: [] });
  });

  it("앞 재생의 끝 기록이 없어도 같은 게시글 안 다시 재생은 뺀다", () => {
    const j = judgePlay(play({ prevRelation: "same_visit", gapStartToStartMs: 4_000, gapEndToStartMs: null }), DEFAULT_RULES);
    expect(j.status).toBe("excluded");
    expect(j.reasons).toContain("replay");
  });

  it("끝 기록이 없는 재생(앱 강제 종료) 자체는 센다", () => {
    // 끝 기록 유무는 그 재생이 세어지는지와 무관하다. 1초라도 재생되면 1번.
    expect(judgePlay(play(), DEFAULT_RULES).status).toBe("counted");
  });
});

describe("judgePlay — 고를 수 있는 조건", () => {
  it('"이 곡의 기록" 시트에서 들은 것은 켰을 때만 뺀다', () => {
    const f = play({ source: "song_history_sheet" });
    expect(judgePlay(f, ALL_OFF).status).toBe("counted");
    expect(judgePlay(f, { ...ALL_OFF, excludeSheet: true }).reasons).toEqual(["sheet"]);
  });

  it("자기 녹음은 켰을 때 빼고, 알 수 없으면 확인 필요", () => {
    const rules = { ...ALL_OFF, excludeOwn: true };
    expect(judgePlay(play({ isOwn: true }), rules).status).toBe("excluded");
    expect(judgePlay(play({ isOwn: null }), rules).status).toBe("check");
    expect(judgePlay(play({ isOwn: null }), ALL_OFF).status).toBe("counted");
  });

  it("나갔다 들어와서 들은 것은 켰을 때만 뺀다", () => {
    const f = play({ prevRelation: "reentry_same_post", gapStartToStartMs: 900_000, gapEndToStartMs: 800_000 });
    expect(judgePlay(f, ALL_OFF).status).toBe("counted");
    expect(judgePlay(f, { ...ALL_OFF, excludeReentry: true }).reasons).toEqual(["reentry"]);
  });

  describe("빠르게 다시 들은 것", () => {
    const rules = { ...ALL_OFF, excludeRepeat: true, repeatWithinSec: 10 };

    it("앞 재생이 끝난 뒤 10초 안이면 뺀다 (경계 포함)", () => {
      const f = play({ prevRelation: "other_screen", gapStartToStartMs: 200_000, gapEndToStartMs: 10_000 });
      expect(judgePlay(f, rules).reasons).toEqual(["repeat"]);
      expect(judgePlay({ ...f, gapEndToStartMs: 10_001 }, rules).status).toBe("counted");
    });

    it("시간 기준을 앞 재생 시작으로 바꾸면 시작 간격을 본다", () => {
      const f = play({ prevRelation: "other_screen", gapStartToStartMs: 8_000, gapEndToStartMs: 50_000 });
      expect(judgePlay(f, rules).status).toBe("counted");
      expect(judgePlay(f, { ...rules, repeatFrom: "prev_start" }).status).toBe("excluded");
    });

    it("앞 재생과 겹친 재생(음수 간격)도 뺀다", () => {
      const f = play({ prevRelation: "other_screen", gapStartToStartMs: 3_000, gapEndToStartMs: -2_000 });
      expect(judgePlay(f, rules).status).toBe("excluded");
    });

    it("앞 재생 끝 기록이 없으면 확인 필요", () => {
      const f = play({ prevRelation: "other_screen", gapStartToStartMs: 3_000, gapEndToStartMs: null });
      expect(judgePlay(f, rules)).toEqual({ status: "check", reasons: [], missing: ["repeat"] });
    });

    it("앞 재생이 없으면 적용하지 않는다", () => {
      expect(judgePlay(play(), rules).status).toBe("counted");
    });
  });

  it("빼는 사유가 있으면 확인 필요보다 우선한다", () => {
    const f = play({ isOwn: null, prevRelation: "reentry_same_post", gapStartToStartMs: 5_000, gapEndToStartMs: null });
    const j = judgePlay(f, { ...DEFAULT_RULES, excludeReentry: true });
    expect(j).toEqual({ status: "excluded", reasons: ["reentry"], missing: ["own", "repeat"] });
  });
});

describe("summarizePlays", () => {
  const facts = [
    play({ recordingId: "R-1", songKey: "A" }),
    play({ recordingId: "R-1", songKey: "A", prevRelation: "same_visit", gapStartToStartMs: 1_000, gapEndToStartMs: 500 }),
    play({ recordingId: "R-2", songKey: "A" }),
    play({ recordingId: "R-3", songKey: "B", isOwn: true }),
    play({ recordingId: "R-3", songKey: "B", isOwn: null }),
  ];

  it("전체 = 정산 대상 + 제외 + 확인 필요", () => {
    const { totals, reasonHits } = summarizePlays(facts, DEFAULT_RULES, "song");
    expect(totals).toEqual({ raw: 5, counted: 2, excluded: 2, check: 1 });
    expect(totals.counted + totals.excluded + totals.check).toBe(totals.raw);
    expect(reasonHits.replay).toBe(1);
    expect(reasonHits.own).toBe(1);
  });

  it("곡별로 묶고 녹음 수를 센다, 정산 대상 많은 순", () => {
    const { rows } = summarizePlays(facts, DEFAULT_RULES, "song");
    expect(rows.map((r) => [r.key, r.counted, r.raw, r.recordingCount])).toEqual([
      ["A", 2, 3, 2],
      ["B", 0, 2, 1],
    ]);
  });

  it("녹음별로 묶으면 곡을 함께 돌려준다", () => {
    const { rows } = summarizePlays(facts, DEFAULT_RULES, "recording");
    expect(rows.map((r) => [r.key, r.songKey, r.counted])).toEqual([
      ["R-1", "A", 1],
      ["R-2", "A", 1],
      ["R-3", "B", 0],
    ]);
  });
});

describe("estimateWon", () => {
  it("재생 수 × 단가를 소수 오차 없이 계산한다", () => {
    expect(estimateWon(781, 2.7)).toBe(2108.7);
    expect(estimateWon(1284, 2.7)).toBe(3466.8);
    expect(estimateWon(3, 0.1)).toBe(0.3);
    expect(estimateWon(0, 2.7)).toBe(0);
  });
});

describe("parseWonPerPlay", () => {
  it("양수만 단가로 받는다", () => {
    expect(parseWonPerPlay("2.5")).toBe(2.5);
    expect(parseWonPerPlay(" 3 ")).toBe(3);
    expect(parseWonPerPlay(undefined)).toBeNull();
    expect(parseWonPerPlay("")).toBeNull();
    expect(parseWonPerPlay("0")).toBeNull();
    expect(parseWonPerPlay("-1")).toBeNull();
    expect(parseWonPerPlay("abc")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import { toCsv } from "./csv";
import { DEFAULT_RULES, type PlaybackFact } from "./playback";
import { exportTable, kstDateTime, rulesSummary } from "./playback-export";

const fact = (p: Partial<PlaybackFact> = {}): PlaybackFact => ({
  sessionId: "s1",
  recordingId: "R-1",
  songKey: "A",
  isOwn: false,
  source: "post_detail",
  prevRelation: "none",
  gapStartToStartMs: null,
  gapEndToStartMs: null,
  ...p,
});

describe("toCsv", () => {
  it("BOM, CRLF, 쉼표 · 따옴표 감싸기", () => {
    expect(toCsv([["a", 1], ['x,"y"', "z"]])).toBe('\uFEFFa,1\r\n"x,""y""",z');
  });
});

describe("exportTable", () => {
  const facts = [
    fact({ startedAt: "2026-10-01T15:30:00Z" }),
    fact({ sessionId: "s2", prevRelation: "same_visit", gapStartToStartMs: 1000, gapEndToStartMs: 500 }),
  ];

  it("곡별", () => {
    const t = exportTable(facts, DEFAULT_RULES, "song", { A: "곡 A" });
    expect(t.rows).toEqual([["곡 A", 1, 1, 2, 1, 0]]);
  });

  it("재생 하나씩: 결과와 사유를 적는다", () => {
    const t = exportTable(facts, DEFAULT_RULES, "play", { A: "곡 A" });
    expect(t.rows[0].slice(0, 2)).toEqual(["s1", "2026-10-02 00:30:00"]);
    expect(t.rows[0][6]).toBe("정산 대상");
    expect(t.rows[1].slice(5)).toEqual(["같은 게시글 안", "제외", "같은 게시글 안 다시 재생 / 빠르게 다시 들은 것"]);
  });
});

describe("rulesSummary", () => {
  it("켜 둔 조건만", () => {
    expect(rulesSummary(DEFAULT_RULES)).toEqual(["자기 녹음 뺌", "앞 재생 끝 10초 안 또 들음 뺌"]);
  });
});

it("kstDateTime", () => {
  expect(kstDateTime("2026-10-31T15:00:00Z")).toBe("2026-11-01 00:00:00");
});

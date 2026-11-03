import { describe, expect, it } from "vitest";

import {
  compareForExport,
  compareForScreen,
  goalTotal,
  missionProgress,
  missionsOf,
  roleSummary,
  type MissionCounts,
  type MissionTester,
} from "./missions";

const c = (firstUpload: number, comment: number, repractice: number, repracticeComment: number): MissionCounts => ({
  firstUpload,
  comment,
  repractice,
  repracticeComment,
});

const t = (role: MissionTester["role"], nickname: string | null, counts: MissionCounts): MissionTester => ({
  role,
  nickname,
  account: "apple",
  counts,
});

describe("미션 기준", () => {
  it("구분별 목표 합은 일반인 3 · 실력자 8 · 전문가 10", () => {
    expect([goalTotal("user"), goalTotal("skilled"), goalTotal("expert")]).toEqual([3, 8, 10]);
  });

  it("해당 없는 미션은 빠진다", () => {
    expect(missionsOf("user")).toEqual(["firstUpload", "repractice"]);
    expect(missionsOf("expert")).toEqual(["comment", "repracticeComment"]);
  });
});

describe("missionProgress", () => {
  it("일반인 최초 녹음 1/2 는 33%", () => {
    const p = missionProgress("user", c(1, 0, 0, 0));
    expect(p.ratio).toBeCloseTo(1 / 3);
    expect(p.percent).toBe(33);
    expect(p.status).toBe("inProgress");
  });

  it("목표를 넘긴 개수와 해당 없는 미션 실적은 진행률에 넣지 않는다", () => {
    const p = missionProgress("user", c(5, 9, 0, 4));
    expect(p.got).toBe(2);
    expect(p.percent).toBe(67);
  });

  it("목표를 모두 채우면 완료", () => {
    expect(missionProgress("expert", c(0, 12, 0, 3)).status).toBe("done");
  });

  it("목표 미션 실적이 없으면 미활동", () => {
    expect(missionProgress("skilled", c(0, 0, 0, 0)).status).toBe("inactive");
  });
});

describe("정렬", () => {
  const list = [
    t("expert", "mic", c(0, 0, 0, 0)),
    t("user", "겨리", c(0, 0, 0, 0)),
    t("user", "NAME", c(0, 0, 0, 0)),
    t("user", "dmstjddlr1", c(0, 0, 0, 0)),
    t("user", "지누", c(1, 0, 0, 0)),
    t("user", "완료자", c(2, 0, 1, 0)),
  ];

  it("화면: 미완료 먼저, 진행률 낮은 순, 닉네임은 글자 코드 순", () => {
    expect([...list].sort(compareForScreen).map((x) => x.nickname)).toEqual([
      "NAME",
      "dmstjddlr1",
      "겨리",
      "지누",
      "완료자",
      "mic",
    ]);
  });

  it("엑셀: 진행률 높은 순", () => {
    expect([...list].sort(compareForExport).map((x) => x.nickname)).toEqual([
      "완료자",
      "지누",
      "NAME",
      "dmstjddlr1",
      "겨리",
      "mic",
    ]);
  });
});

it("roleSummary 는 구분별 인원과 완료 인원을 센다", () => {
  const list = [t("user", "a", c(2, 0, 1, 0)), t("user", "b", c(0, 0, 0, 0)), t("expert", "c", c(0, 7, 0, 3))];
  expect(roleSummary(list, "user")).toEqual({ total: 2, done: 1 });
  expect(roleSummary(list, "skilled")).toEqual({ total: 0, done: 0 });
});

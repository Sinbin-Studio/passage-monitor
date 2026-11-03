import { describe, expect, it } from "vitest";

import { checkNotice, noticeBlocks, noticeDate, storeLink, versionFromTitle } from "./notices";

const LINKS = { androidUrl: "https://play.google.com/store/apps/details?id=x", iosUrl: "https://testflight.apple.com/join/x" };

describe("versionFromTitle", () => {
  it("제목의 첫 x.y.z", () => {
    expect(versionFromTitle("Passage 0.4.2 업데이트 안내")).toBe("0.4.2");
    expect(versionFromTitle("v1.10.0 안내 (2.0.0 예정)")).toBe("1.10.0");
  });

  it("버전이 아니면 null", () => {
    expect(versionFromTitle("업데이트 안내")).toBeNull();
    expect(versionFromTitle("0.4 업데이트")).toBeNull();
    expect(versionFromTitle("1.2.3.4 빌드")).toBeNull();
  });
});

it("storeLink 는 https 만", () => {
  expect(storeLink(" https://a.b ")).toBe("https://a.b");
  expect(storeLink("http://a.b")).toBeNull();
  expect(storeLink("")).toBeNull();
  expect(storeLink(undefined)).toBeNull();
});

describe("checkNotice", () => {
  const base = { kind: "update" as const, title: "Passage 0.4.2 업데이트 안내", summary: "요약", body: "## 새로워진 점\r\n- 하나\n" };

  it("업데이트 공지: 버전 · 링크를 붙이고 공백을 다듬는다", () => {
    const r = checkNotice({ ...base, title: "  Passage 0.4.2 업데이트 안내 " }, LINKS);
    expect(r).toEqual({
      ok: true,
      input: { kind: "update", title: "Passage 0.4.2 업데이트 안내", summary: "요약", body: "## 새로워진 점\n- 하나", latestVersion: "0.4.2", ...LINKS },
    });
  });

  it("업데이트 공지인데 제목에 버전이 없으면 막는다", () => {
    const r = checkNotice({ ...base, title: "업데이트 안내" }, LINKS);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toContain("새 버전");
  });

  it("스토어 링크가 하나라도 없으면 업데이트 공지를 막는다", () => {
    const r = checkNotice(base, { androidUrl: LINKS.androidUrl, iosUrl: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toContain("스토어 링크");
  });

  it("안내 공지는 링크 없이 올리고 버전 · 링크를 넣지 않는다", () => {
    const r = checkNotice({ ...base, kind: "info" }, { androidUrl: null, iosUrl: null });
    expect(r.ok && r.input).toMatchObject({ latestVersion: null, androidUrl: null, iosUrl: null });
  });

  it("제목 100자 · 요약 200자 제한, 빈 칸", () => {
    const r = checkNotice({ kind: "info", title: "가".repeat(101), summary: " ", body: "" }, LINKS);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toEqual(["제목은 100자까지 쓸 수 있어요.", "요약을 써 주세요."]);
    expect(checkNotice({ kind: "info", title: "가".repeat(100), summary: "나".repeat(200), body: "" }, LINKS).ok).toBe(true);
  });
});

it("noticeBlocks 는 앱처럼 나눈다", () => {
  expect(noticeBlocks("## 제목\n\n- 점\n문단\n  ##붙음")).toEqual([
    { type: "heading", text: "제목" },
    { type: "bullet", text: "점" },
    { type: "paragraph", text: "문단" },
    { type: "paragraph", text: "##붙음" },
  ]);
});

it("noticeDate 는 한국 날짜", () => {
  expect(noticeDate("2026-11-02T16:00:00Z")).toBe("2026년 11월 3일");
});

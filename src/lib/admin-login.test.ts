import { describe, expect, it } from "vitest";

import { adminLoginEmail } from "./admin-login";

describe("adminLoginEmail", () => {
  it("아이디 뒤에 도메인을 붙인다 (공백 · 대문자 정리)", () => {
    expect(adminLoginEmail(" Admin1 ", "x.com")).toBe("admin1@x.com");
  });

  it("이메일을 그대로 넣으면 그대로 쓴다", () => {
    expect(adminLoginEmail("a@b.com", "x.com")).toBe("a@b.com");
  });
});

import { describe, expect, it } from "vitest";

import { missionExportFilename, missionWorkbook } from "./mission-export";
import type { MissionTester } from "./missions";
import { colName, crc32 } from "./xlsx";

/** stored zip 을 풀어 파일 이름 → 내용(문자열). CRC 도 확인한다. */
function unzip(bytes: Uint8Array): Record<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const dec = new TextDecoder();
  const out: Record<string, string> = {};
  let pos = 0;
  while (view.getUint32(pos, true) === 0x04034b50) {
    const crc = view.getUint32(pos + 14, true);
    const size = view.getUint32(pos + 18, true);
    const nameLen = view.getUint16(pos + 26, true);
    const name = dec.decode(bytes.slice(pos + 30, pos + 30 + nameLen));
    const data = bytes.slice(pos + 30 + nameLen, pos + 30 + nameLen + size);
    expect(crc32(data)).toBe(crc);
    out[name] = dec.decode(data);
    pos += 30 + nameLen + size;
  }
  expect(view.getUint32(bytes.length - 22, true)).toBe(0x06054b50);
  expect(view.getUint16(bytes.length - 22 + 10, true)).toBe(Object.keys(out).length);
  return out;
}

const tester = (
  role: MissionTester["role"],
  nickname: string | null,
  account: string,
  counts: [number, number, number, number],
): MissionTester => ({
  role,
  nickname,
  account,
  counts: { firstUpload: counts[0], comment: counts[1], repractice: counts[2], repracticeComment: counts[3] },
});

const TESTERS = [
  tester("expert", "mic", "a@gmail.com", [0, 3, 0, 0]),
  tester("user", null, "apple", [0, 0, 0, 0]),
  tester("user", "지누", "b@gmail.com", [1, 0, 0, 0]),
  tester("skilled", "R&B<가수>", "c@gmail.com", [2, 5, 1, 0]),
];

const NOW = new Date("2026-10-31T05:00:00Z");

describe("xlsx 도구", () => {
  it("crc32 표준 검사값", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("열 이름", () => {
    expect([colName(0), colName(8), colName(25), colName(26)]).toEqual(["A", "I", "Z", "AA"]);
  });
});

describe("missionWorkbook", () => {
  const files = unzip(missionWorkbook(TESTERS, { now: NOW, since: null, isSample: false }));

  it("엑셀이 여는 데 필요한 파일과 시트 3개", () => {
    expect(Object.keys(files).sort()).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/workbook.xml",
      "xl/worksheets/sheet1.xml",
      "xl/worksheets/sheet2.xml",
      "xl/worksheets/sheet3.xml",
    ]);
    const names = [...files["xl/workbook.xml"].matchAll(/<sheet name="([^"]+)"/g)].map((m) => m[1]);
    expect(names).toEqual(["미션 현황", "구분별 요약", "미션 기준"]);
  });

  it("미션 현황: 구분 → 진행률 높은 순, 해당 없는 미션은 '-', 진행률 · 완료는 수식", () => {
    const s = files["xl/worksheets/sheet1.xml"];
    const nickRows = [...s.matchAll(/<c r="B(\d+)" s="3" t="inlineStr"><is><t xml:space="preserve">([^<]*)</g)].map((m) => m[2]);
    expect(nickRows).toEqual(["지누", "(닉네임 없음)", "R&amp;B&lt;가수&gt;", "mic"]);
    // 지누: 최초 녹음 1, 일반 게시글 코멘트 '-', 진행률 1/3
    expect(s).toContain('<c r="D2" s="2"><v>1</v></c>');
    expect(s).toContain('<c r="E2" s="2" t="inlineStr"><is><t xml:space="preserve">-</t></is></c>');
    expect(s).toMatch(/<c r="H2" s="4"><f>\(MIN\(N\(D2\),INDEX\('미션 기준'!\$C\$2:\$C\$4,MATCH\(\$A2,'미션 기준'!\$A\$2:\$A\$4,0\)\)\)\+/);
    expect(s).toContain("<v>0.3333333333333333</v>");
    expect(s).toContain('<c r="I4" s="2" t="str"><f>IF(H4&gt;=1,&quot;완료&quot;,&quot;미완료&quot;)</f><v>완료</v></c>');
    expect(s).toContain('<autoFilter ref="A1:I5"/>');
    expect(s).toContain('xSplit="3" ySplit="1" topLeftCell="D2"');
    expect(s).toContain("<xm:sqref>D2:D5</xm:sqref>");
  });

  it("구분별 요약: 수식과 미리 계산한 값", () => {
    const s = files["xl/worksheets/sheet2.xml"];
    expect(s).toContain(`<c r="B2" s="2"><f>COUNTIF('미션 현황'!$A$2:$A$5,A2)</f><v>2</v></c>`);
    expect(s).toContain(`<c r="C3" s="2"><f>COUNTIFS('미션 현황'!$A$2:$A$5,A3,'미션 현황'!$I$2:$I$5,&quot;완료&quot;)</f><v>1</v></c>`);
    expect(s).toContain(`<c r="B5" s="5"><f>SUM(B2:B4)</f><v>4</v></c>`);
  });

  it("미션 기준: 파란 목표값과 총 미션 수식, 집계 시각", () => {
    const s = files["xl/worksheets/sheet3.xml"];
    expect(s).toContain('<c r="D3" s="10"><v>5</v></c>');
    expect(s).toContain('<c r="G4" s="9"><f>SUM(C4:F4)</f><v>10</v></c>');
    expect(s).toContain("2026-10-31 14:00 Passage Monitor 에서 받음, 전체 기간");
  });
});

it("파일 이름은 한국 날짜", () => {
  expect(missionExportFilename(new Date("2026-10-31T16:00:00Z"))).toBe("beta_mission_status_261101.xlsx");
});

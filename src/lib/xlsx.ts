// 아주 작은 .xlsx 작성기. 라이브러리 없이 시트 · 서식 · 수식 · 틀 고정 · 필터 · 조건부 서식을 담는다.
// 압축하지 않은 zip(stored) 으로 묶는다. 엑셀 · 구글 시트 · 한셀이 그대로 연다.

export type XlsxValue = string | number;

/** 수식은 앞의 "=" 없이 쓴다. value 는 엑셀이 다시 계산하기 전 보이는 값. */
export type XlsxCell = { value?: XlsxValue; formula?: string; style?: number } | null;

export type XlsxSheet = {
  name: string;
  /** 열 너비 (A 열부터) */
  widths?: number[];
  /** rows[0] 이 1행. 빈 행은 [] */
  rows: XlsxCell[][];
  /** 왼쪽 cols 열 · 위쪽 rows 행 고정 */
  freeze?: { cols: number; rows: number };
  /** 예: "A1:I27" */
  autoFilter?: string;
  /** <conditionalFormatting> 요소들 (원문 XML) */
  conditionalFormatting?: string;
  /** <extLst> 안 <ext> 요소들 (원문 XML) */
  ext?: string;
};

export type XlsxBook = {
  sheets: XlsxSheet[];
  /** xl/styles.xml 전체 */
  stylesXml: string;
};

const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

export const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** 0 → "A", 26 → "AA" */
export function colName(index: number): string {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export const cellRef = (col: number, row: number) => `${colName(col)}${row + 1}`;

/** 시트 이름을 수식에서 쓰는 꼴로: '미션 기준' */
export const sheetRef = (name: string) => `'${name.replace(/'/g, "''")}'`;

function cellXml(cell: XlsxCell, col: number, row: number) {
  if (!cell) return "";
  const r = cellRef(col, row);
  const s = cell.style ? ` s="${cell.style}"` : "";
  const v = cell.value;
  if (cell.formula !== undefined) {
    const f = `<f>${escapeXml(cell.formula)}</f>`;
    if (typeof v === "number") return `<c r="${r}"${s}>${f}<v>${numberText(v)}</v></c>`;
    if (typeof v === "string") return `<c r="${r}"${s} t="str">${f}<v>${escapeXml(v)}</v></c>`;
    return `<c r="${r}"${s}>${f}</c>`;
  }
  if (typeof v === "number") return `<c r="${r}"${s}><v>${numberText(v)}</v></c>`;
  if (typeof v === "string") {
    return `<c r="${r}"${s} t="inlineStr"><is><t xml:space="preserve">${escapeXml(v)}</t></is></c>`;
  }
  return `<c r="${r}"${s}/>`;
}

const numberText = (n: number) => (Number.isFinite(n) ? String(n) : "0");

function sheetXml(sheet: XlsxSheet, selected: boolean) {
  const rowsXml = sheet.rows
    .map((cells, ri) => {
      const inner = cells.map((c, ci) => cellXml(c, ci, ri)).join("");
      return inner ? `<row r="${ri + 1}">${inner}</row>` : "";
    })
    .join("");

  const lastRow = Math.max(1, sheet.rows.length);
  const lastCol = Math.max(1, ...sheet.rows.map((r) => r.length));
  const dimension = `<dimension ref="A1:${cellRef(lastCol - 1, lastRow - 1)}"/>`;

  const tab = selected ? ' tabSelected="1"' : "";
  let view = `<sheetView${tab} workbookViewId="0"/>`;
  if (sheet.freeze && (sheet.freeze.cols > 0 || sheet.freeze.rows > 0)) {
    const { cols, rows } = sheet.freeze;
    const topLeft = cellRef(cols, rows);
    const pane = cols > 0 && rows > 0 ? "bottomRight" : cols > 0 ? "topRight" : "bottomLeft";
    const split = `${cols > 0 ? ` xSplit="${cols}"` : ""}${rows > 0 ? ` ySplit="${rows}"` : ""}`;
    view =
      `<sheetView${tab} workbookViewId="0"><pane${split} topLeftCell="${topLeft}" activePane="${pane}" state="frozen"/>` +
      `<selection pane="${pane}" activeCell="${topLeft}" sqref="${topLeft}"/></sheetView>`;
  }

  const cols = sheet.widths?.length
    ? `<cols>${sheet.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>`
    : "";

  return (
    HEAD +
    `<worksheet ${NS}>` +
    dimension +
    `<sheetViews>${view}</sheetViews>` +
    '<sheetFormatPr defaultRowHeight="16.5"/>' +
    cols +
    `<sheetData>${rowsXml}</sheetData>` +
    (sheet.autoFilter ? `<autoFilter ref="${sheet.autoFilter}"/>` : "") +
    (sheet.conditionalFormatting ?? "") +
    '<pageMargins left="0.75" right="0.75" top="1" bottom="1" header="0.5" footer="0.5"/>' +
    (sheet.ext ? `<extLst>${sheet.ext}</extLst>` : "") +
    "</worksheet>"
  );
}

function workbookXml(sheets: XlsxSheet[]) {
  const list = sheets.map((s, i) => `<sheet name="${escapeXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("");
  const filters = sheets
    .map((s, i) => {
      if (!s.autoFilter) return "";
      const [a, b] = s.autoFilter.split(":");
      const abs = (ref: string) => ref.replace(/^([A-Z]+)(\d+)$/, "$$$1$$$2");
      return `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">${escapeXml(sheetRef(s.name))}!${abs(a)}:${abs(b ?? a)}</definedName>`;
    })
    .join("");
  return (
    HEAD +
    `<workbook ${NS}><bookViews><workbookView/></bookViews><sheets>${list}</sheets>` +
    (filters ? `<definedNames>${filters}</definedNames>` : "") +
    '<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>'
  );
}

function contentTypesXml(count: number) {
  const sheets = Array.from(
    { length: count },
    (_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
  ).join("");
  return (
    HEAD +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    sheets +
    "</Types>"
  );
}

const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

function workbookRelsXml(count: number) {
  const sheets = Array.from(
    { length: count },
    (_, i) => `<Relationship Id="rId${i + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
  ).join("");
  return (
    HEAD +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    sheets +
    `<Relationship Id="rId${count + 1}" Type="${REL}/styles" Target="styles.xml"/>` +
    "</Relationships>"
  );
}

const ROOT_RELS =
  HEAD +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  `<Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/>` +
  "</Relationships>";

export function buildXlsx(book: XlsxBook): Uint8Array {
  const files: [string, string][] = [
    ["[Content_Types].xml", contentTypesXml(book.sheets.length)],
    ["_rels/.rels", ROOT_RELS],
    ["xl/workbook.xml", workbookXml(book.sheets)],
    ["xl/_rels/workbook.xml.rels", workbookRelsXml(book.sheets.length)],
    ["xl/styles.xml", book.stylesXml],
    ...book.sheets.map((s, i): [string, string] => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s, i === 0)]),
  ];
  const enc = new TextEncoder();
  return zipStored(files.map(([name, text]) => ({ name, data: enc.encode(text) })));
}

// ---------------------------------------------------------------------------
// zip (압축 없음)

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function zipStored(entries: { name: string; data: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  // 1980-01-01 00:00 (DOS 날짜 최솟값). 파일 내용과 무관하다.
  const dosTime = 0;
  const dosDate = (0 << 9) | (1 << 5) | 1;

  for (const e of entries) {
    const name = enc.encode(e.name);
    const crc = crc32(e.data);
    const size = e.data.length;

    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // 이름 UTF-8
    lv.setUint16(8, 0, true); // stored
    lv.setUint16(10, dosTime, true);
    lv.setUint16(12, dosDate, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, name.length, true);
    lv.setUint16(28, 0, true);
    local.set(name, 30);
    parts.push(local, e.data);

    const cd = new Uint8Array(46 + name.length);
    const cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, dosTime, true);
    cv.setUint16(14, dosDate, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    cd.set(name, 46);
    central.push(cd);

    offset += local.length + size;
  }

  const cdSize = central.reduce((s, c) => s + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);

  const all = [...parts, ...central, end];
  const out = new Uint8Array(all.reduce((s, p) => s + p.length, 0));
  let pos = 0;
  for (const p of all) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}

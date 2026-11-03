// CSV 문자열 만들기. 엑셀에서 한글이 깨지지 않도록 BOM 을 붙이고 줄바꿈은 CRLF.

export type CsvCell = string | number;

export function toCsv(lines: readonly (readonly CsvCell[])[]): string {
  const esc = (v: CsvCell) => {
    const s = String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "\uFEFF" + lines.map((l) => l.map(esc).join(",")).join("\r\n");
}

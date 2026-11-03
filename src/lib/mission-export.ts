// 미션 현황 엑셀 (beta_mission_status_YYMMDD.xlsx). 사용자가 만든 엑셀(2026-10-31)과 같은 모양:
//   1. 미션 현황   — 테스터마다 미션 개수 · 진행률 · 완료 (진행률 · 완료는 수식)
//   2. 구분별 요약 — 인원 · 완료 인원 · 평균 진행률 · 미션별 합계 (수식)
//   3. 미션 기준   — 목표값(파란 숫자, 바꾸면 1번 시트가 다시 계산됨)과 집계 기준
// 판정 기준은 lib/missions.ts 를 따른다.

import {
  MISSIONS,
  MISSION_GOALS,
  MISSION_LABEL,
  ROLES,
  ROLE_LABEL,
  compareForExport,
  goalTotal,
  missionProgress,
  nicknameOf,
  type MissionTester,
} from "./missions";
import { buildXlsx, cellRef, colName, escapeXml, sheetRef, type XlsxCell, type XlsxSheet } from "./xlsx";

const STATUS = "미션 현황";
const SUMMARY = "구분별 요약";
const GOALS = "미션 기준";

/** 서식 번호 (아래 STYLES_XML 의 cellXfs 순서) */
const S = {
  header: 1,
  center: 2,
  left: 3,
  percent: 4,
  boldCenter: 5,
  boldPercent: 6,
  note: 7,
  goalRole: 8,
  goalCount: 9,
  goalInput: 10,
  boldNote: 11,
} as const;

const GREEN = "FFD1FAE5";

const STYLES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="1"><numFmt numFmtId="176" formatCode="0;\\-0;&quot;-&quot;"/></numFmts>' +
  '<fonts count="5">' +
  '<font><sz val="11"/><color theme="1"/><name val="맑은 고딕"/><family val="2"/><scheme val="minor"/></font>' +
  '<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>' +
  '<font><b/><sz val="10"/><name val="Arial"/></font>' +
  '<font><sz val="10"/><color rgb="FF0000FF"/><name val="Arial"/></font>' +
  '<font><sz val="10"/><name val="Arial"/></font>' +
  "</fonts>" +
  '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FF1F2937"/></patternFill></fill></fills>' +
  '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' +
  '<border><left style="thin"><color rgb="FFD1D5DB"/></left><right style="thin"><color rgb="FFD1D5DB"/></right>' +
  '<top style="thin"><color rgb="FFD1D5DB"/></top><bottom style="thin"><color rgb="FFD1D5DB"/></bottom><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="12">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
  '<xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
  '<xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>' +
  '<xf numFmtId="9" fontId="4" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
  '<xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
  '<xf numFmtId="9" fontId="2" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
  '<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="176" fontId="2" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
  '<xf numFmtId="176" fontId="4" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
  '<xf numFmtId="176" fontId="3" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
  '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  "</cellXfs>" +
  '<cellStyles count="1"><cellStyle name="표준" xfId="0" builtinId="0"/></cellStyles>' +
  `<dxfs count="1"><dxf><fill><patternFill patternType="solid"><bgColor rgb="${GREEN}"/></patternFill></fill></dxf></dxfs>` +
  '<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>' +
  "</styleSheet>";

const text = (value: string, style: number = S.center): XlsxCell => ({ value, style });
const num = (value: number, style: number = S.center): XlsxCell => ({ value, style });
const formula = (f: string, value: string | number, style: number = S.center): XlsxCell => ({ formula: f, value, style });

/** 미션 현황 시트의 미션 열: D, E, F, G. 미션 기준 시트의 목표 열: C, D, E, F. 총 미션: G. */
const STATUS_COL0 = 3;
const GOAL_COL0 = 2;
const GOAL_TOTAL_COL = "G";
const GOAL_ROWS = `$A$2:$A$${ROLES.length + 1}`;

/** 미션 기준 시트에서 그 행 구분의 목표값을 찾는 수식 */
const goalLookup = (goalCol: string, row: number) =>
  `INDEX(${sheetRef(GOALS)}!$${goalCol}$2:$${goalCol}$${ROLES.length + 1},MATCH($A${row},${sheetRef(GOALS)}!${GOAL_ROWS},0))`;

export type MissionExportInfo = {
  /** 내려받은 시각 */
  now: Date;
  /** 집계 시작 (한국 날짜 "2026-10-27"), null = 전체 기간 */
  since: string | null;
  isSample: boolean;
};

const kstLabel = (d: Date) => {
  const k = new Date(d.getTime() + 9 * 3_600_000).toISOString();
  return `${k.slice(0, 10)} ${k.slice(11, 16)}`;
};

/** beta_mission_status_261031.xlsx (한국 날짜) */
export function missionExportFilename(now: Date) {
  const k = new Date(now.getTime() + 9 * 3_600_000).toISOString();
  return `beta_mission_status_${k.slice(2, 4)}${k.slice(5, 7)}${k.slice(8, 10)}.xlsx`;
}

function statusSheet(testers: MissionTester[]): XlsxSheet {
  const header = ["구분", "닉네임", "계정", ...MISSIONS.map((k) => MISSION_LABEL[k]), "진행률", "완료"].map((h) => text(h, S.header));
  const rows: XlsxCell[][] = [header];

  testers.forEach((t, i) => {
    const r = i + 2;
    const progress = missionProgress(t.role, t.counts);
    const missionCells = MISSIONS.map((k) => (MISSION_GOALS[t.role][k] > 0 ? num(t.counts[k]) : text("-")));
    const parts = MISSIONS.map((_, mi) => {
      const c = colName(STATUS_COL0 + mi);
      return `MIN(N(${c}${r}),${goalLookup(colName(GOAL_COL0 + mi), r)})`;
    });
    const ratioF = `(${parts.join("+")})/${goalLookup(GOAL_TOTAL_COL, r)}`;
    rows.push([
      text(ROLE_LABEL[t.role]),
      text(nicknameOf(t), S.left),
      text(t.account, S.left),
      ...missionCells,
      formula(ratioF, progress.ratio, S.percent),
      formula(`IF(H${r}>=1,"완료","미완료")`, progress.status === "done" ? "완료" : "미완료"),
    ]);
  });

  const last = Math.max(2, testers.length + 1);
  // 목표를 채운 미션 칸은 연두색. 다른 시트를 보는 조건이라 엑셀 2010 확장(x14) 형식으로 쓴다.
  const rules = MISSIONS.map((_, mi) => {
    const c = colName(STATUS_COL0 + mi);
    const goal = goalLookup(colName(GOAL_COL0 + mi), 2);
    const f = `AND(ISNUMBER(${c}2),${goal}>0,${c}2>=${goal})`;
    const id = `{00000000-000E-0000-0000-00000${String(mi + 1).padStart(7, "0")}}`;
    return (
      '<x14:conditionalFormatting xmlns:xm="http://schemas.microsoft.com/office/excel/2006/main">' +
      `<x14:cfRule type="expression" priority="${mi + 1}" id="${id}"><xm:f>${escapeXml(f)}</xm:f>` +
      `<x14:dxf><fill><patternFill patternType="solid"><bgColor rgb="${GREEN}"/></patternFill></fill></x14:dxf></x14:cfRule>` +
      `<xm:sqref>${c}2:${c}${last}</xm:sqref></x14:conditionalFormatting>`
    );
  }).join("");

  return {
    name: STATUS,
    widths: [9, 18, 28, 15, 17, 13, 16, 10, 9],
    rows,
    freeze: { cols: 3, rows: 1 },
    autoFilter: `A1:I${last}`,
    conditionalFormatting:
      `<conditionalFormatting sqref="I2:I${last}"><cfRule type="cellIs" dxfId="0" priority="${MISSIONS.length + 1}" operator="equal">` +
      "<formula>&quot;완료&quot;</formula></cfRule></conditionalFormatting>",
    ext:
      '<ext uri="{78C0D931-6437-407d-A8EE-F0AAD7539E65}" xmlns:x14="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main">' +
      `<x14:conditionalFormattings>${rules}</x14:conditionalFormattings></ext>`,
  };
}


function summarySheet(testers: MissionTester[]): XlsxSheet {
  const last = Math.max(2, testers.length + 1);
  const range = (col: string) => `${sheetRef(STATUS)}!$${col}$2:$${col}$${last}`;
  const header = ["구분", "인원", "완료 인원", "평균 진행률", ...MISSIONS.map((k) => `${MISSION_LABEL[k]} 합계`)].map((h) =>
    text(h, S.header),
  );
  const rows: XlsxCell[][] = [header];

  ROLES.forEach((role, i) => {
    const r = i + 2;
    const list = testers.filter((t) => t.role === role);
    const ratios = list.map((t) => missionProgress(t.role, t.counts).ratio);
    const done = list.filter((t) => missionProgress(t.role, t.counts).status === "done").length;
    rows.push([
      text(ROLE_LABEL[role], S.boldCenter),
      formula(`COUNTIF(${range("A")},A${r})`, list.length),
      formula(`COUNTIFS(${range("A")},A${r},${range("I")},"완료")`, done),
      formula(
        `IFERROR(AVERAGEIF(${range("A")},A${r},${range("H")}),0)`,
        ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0,
        S.percent,
      ),
      ...MISSIONS.map((k, mi) =>
        formula(
          `SUMIF(${range("A")},A${r},${range(colName(STATUS_COL0 + mi))})`,
          MISSION_GOALS[role][k] > 0 ? list.reduce((s, t) => s + t.counts[k], 0) : 0,
        ),
      ),
    ]);
  });

  const end = ROLES.length + 1;
  const allRatios = testers.map((t) => missionProgress(t.role, t.counts).ratio);
  const sumCol = (c: string, value: number) => formula(`SUM(${c}2:${c}${end})`, value, S.boldCenter);
  rows.push([
    text("합계", S.boldCenter),
    sumCol("B", testers.length),
    sumCol("C", testers.filter((t) => missionProgress(t.role, t.counts).status === "done").length),
    formula(
      `IFERROR(AVERAGE(${range("H")}),0)`,
      allRatios.length ? allRatios.reduce((a, b) => a + b, 0) / allRatios.length : 0,
      S.boldPercent,
    ),
    ...MISSIONS.map((k, mi) =>
      sumCol(
        colName(4 + mi),
        testers.reduce((s, t) => s + (MISSION_GOALS[t.role][k] > 0 ? t.counts[k] : 0), 0),
      ),
    ),
  ]);
  rows.push([]);
  rows.push([text("'-'(해당 없는 미션)은 합계에서 0으로 셉니다.", S.note)]);

  return { name: SUMMARY, widths: [10, 8, 10, 12, 20, 22, 18, 20], rows };
}

function goalsSheet(testers: MissionTester[], info: MissionExportInfo): XlsxSheet {
  const header = ["구분", "인원", ...MISSIONS.map((k) => MISSION_LABEL[k]), "총 미션"].map((h) => text(h, S.header));
  const rows: XlsxCell[][] = [header];
  ROLES.forEach((role, i) => {
    const r = i + 2;
    rows.push([
      text(ROLE_LABEL[role], S.goalRole),
      num(testers.filter((t) => t.role === role).length, S.goalCount),
      ...MISSIONS.map((k) => num(MISSION_GOALS[role][k], S.goalInput)),
      formula(`SUM(${cellRef(GOAL_COL0, r - 1)}:${cellRef(GOAL_COL0 + MISSIONS.length - 1, r - 1)})`, goalTotal(role), S.goalCount),
    ]);
  });
  const period = info.since ? `${info.since} 이후` : "전체 기간";
  rows.push([], []);
  rows.push([text("출처: Passage 베타테스트 최종 미션 표. 파란 숫자는 목표값 — 바꾸면 '미션 현황' 진행률이 다시 계산됩니다.", S.note)]);
  rows.push([
    text(
      `집계 기준 (${kstLabel(info.now)} Passage Monitor 에서 받음, ${period}${info.isSample ? ", 예시 데이터" : ""})`,
      S.boldNote,
    ),
  ]);
  rows.push([text("· 최초 녹음 = 본인 글 중 재연습이 아닌 글 / 재연습 = 같은 곡을 두 번째 이후로 올린 글 (앱의 재연습 태그와 같음)", S.note)]);
  rows.push([text("· 코멘트 = 남의 글에 단 피드백만, 글 단위로 셈 (한 글에 여러 개를 달아도 1개). 본인 글에 단 피드백은 제외", S.note)]);
  rows.push([text("· 지워진 글·피드백은 세지 않음. 운영자 · 테스트 계정 제외", S.note)]);

  return { name: GOALS, widths: [10, 8, 16, 18, 14, 16, 10], rows };
}

export function missionWorkbook(testers: readonly MissionTester[], info: MissionExportInfo): Uint8Array {
  const sorted = [...testers].sort(compareForExport);
  return buildXlsx({
    sheets: [statusSheet(sorted), summarySheet(sorted), goalsSheet(sorted, info)],
    stylesXml: STYLES_XML,
  });
}

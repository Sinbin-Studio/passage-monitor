"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ESTIMATE_WON_PER_PLAY, estimateWon, summarizePlays } from "@/lib/playback";
import { EXPORT_UNIT_LABEL, exportTable, rulesSummary, type ExportUnit } from "@/lib/playback-export";

import type { MonthData } from "../load-month";
import { useRules } from "../rules-context";
import { DownloadIcon, MonthPicker, MoreRow, ROW_LIMIT, Segmented, csvTitleLine, downloadCsv, fmt, won } from "../ui";

const card = "min-w-0 overflow-hidden rounded-2xl border border-line bg-surface";
const chip = "rounded-full px-2.5 py-1 text-xs font-extrabold";

export function SettlementView({ facts, songTitle, month, isSample }: MonthData) {
  const { rules } = useRules();
  const ruleTags = rulesSummary(rules);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">정산 · 파일</h1>
        <div className="ml-auto">
          <MonthPicker month={month} basePath="/settlement" />
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
        <section aria-labelledby="komca-h" className={`${card} flex flex-col gap-3 p-5`}>
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-status-inactive-fg" aria-hidden="true">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            <h2 id="komca-h" className="text-[17px] font-extrabold">KOMCA 정산 기준</h2>
            <span className={`${chip} bg-status-inactive text-status-inactive-fg`}>아직 없음</span>
          </div>
          <p className="text-sm text-muted">
            KOMCA 와 기준을 합의한 뒤 등록합니다. 등록 전에는 이 화면의 어떤 숫자도 정산 확정이 아닙니다.
          </p>
          <button type="button" disabled className="min-h-11 rounded-[10px] bg-background text-sm font-extrabold text-muted">
            KOMCA 보고서 (기준 등록 후)
          </button>
        </section>

        <section aria-labelledby="saved-h" className={`${card} flex flex-col gap-3 p-5`}>
          <h2 id="saved-h" className="text-[17px] font-extrabold">지금 쓰는 제외 기준</h2>
          <div className="flex flex-wrap gap-1.5">
            <span className={`${chip} bg-background text-foreground`}>같은 게시글 안 다시 재생 뺌 (항상)</span>
            {ruleTags.map((t) => (
              <span key={t} className={`${chip} bg-brand-soft text-brand-deep`}>
                {t}
              </span>
            ))}
          </div>
          <p className="text-sm text-muted">
            <Link href={`/playback?month=${month.key}`} className="font-extrabold text-status-progress-fg hover:text-brand-deep">
              재생 현황에서 바꾸기 →
            </Link>
            <span className="ml-2">저장 기능은 아직 없습니다. 새로고침하면 기본값으로 돌아갑니다.</span>
          </p>
        </section>
      </div>

      <Estimate facts={facts} songTitle={songTitle} monthLabel={month.label} isSample={isSample} />
      <FileExport facts={facts} songTitle={songTitle} month={month} isSample={isSample} />
    </div>
  );
}

function Estimate({
  facts,
  songTitle,
  monthLabel,
  isSample,
}: Pick<MonthData, "facts" | "songTitle" | "isSample"> & { monthLabel: string }) {
  const { rules } = useRules();
  const [expanded, setExpanded] = useState(false);
  const { totals, rows } = useMemo(() => summarizePlays(facts, rules, "song"), [facts, rules]);

  const hidden = rows.length - ROW_LIMIT;
  const shown = expanded ? rows : rows.slice(0, ROW_LIMIT);

  if (ESTIMATE_WON_PER_PLAY === null) {
    return (
      <section aria-labelledby="est-h" className={`${card} flex flex-col gap-2 p-5`}>
        <h2 id="est-h" className="text-[17px] font-extrabold">예상 계산안</h2>
        <p className="text-sm text-muted">단가 설정(NEXT_PUBLIC_ESTIMATE_WON_PER_PLAY)이 없어 예상 금액을 계산하지 않습니다.</p>
      </section>
    );
  }
  const perPlay = ESTIMATE_WON_PER_PLAY;
  const rate = `${perPlay}원`;
  const estimate = (plays: number) => won(estimateWon(plays, perPlay));

  return (
    <section aria-labelledby="est-h" className={card}>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3.5">
        <h2 id="est-h" className="text-[17px] font-extrabold">예상 계산안</h2>
        <span className={`${chip} bg-brand-soft text-brand-deep`}>1회 {rate}</span>
        <span className="ml-auto text-[13px] text-muted">{monthLabel}</span>
      </div>

      <div className="flex flex-wrap gap-5 p-5">
        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
          <div className="flex flex-col gap-1 rounded-2xl bg-brand-deep px-[22px] py-5 text-white">
            <span className="text-sm font-extrabold text-[#d9d0ff]">예상 금액</span>
            <span className="text-[36px] leading-tight font-extrabold tracking-tight">{estimate(totals.counted)}</span>
            <span className="text-[13px] text-[#d9d0ff]">
              정산 대상 {fmt(totals.counted)}회 × {rate}
            </span>
          </div>
          <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 text-sm">
            <dt className="text-muted">전체 재생으로 계산하면</dt>
            <dd className="text-right font-extrabold">{estimate(totals.raw)}</dd>
            <dt className="text-muted">제외 {fmt(totals.excluded)}회</dt>
            <dd className="text-right font-extrabold text-status-check-fg">−{estimate(totals.excluded)}</dd>
            <dt className="text-muted">확인 필요 {fmt(totals.check)}회 (넣지 않음)</dt>
            <dd className="text-right font-extrabold text-muted">−{estimate(totals.check)}</dd>
          </dl>
        </div>

        <div className="min-w-0 flex-[999_1_420px] overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[380px] border-collapse text-[15px]">
            <thead>
              <tr className="bg-[#faf9fd] text-right text-[13px] text-muted">
                <th scope="col" className="px-4 py-3 text-left font-extrabold">곡</th>
                <th scope="col" className="px-2.5 py-3 font-extrabold">정산 대상</th>
                <th scope="col" className="py-3 pr-4 pl-2.5 font-extrabold text-brand-deep">예상 금액</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.key} className="border-t border-[#efedf6] text-right">
                  <th scope="row" className="px-4 py-3 text-left font-extrabold">{songTitle[r.songKey] ?? r.key}</th>
                  <td className="px-2.5 py-3">{fmt(r.counted)}회</td>
                  <td className="py-3 pr-4 pl-2.5 font-extrabold text-brand-deep">{estimate(r.counted)}</td>
                </tr>
              ))}
              <MoreRow colSpan={3} hidden={hidden} unit="곡" expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
              <tr className="border-t-2 border-line bg-[#faf9fd] text-right">
                <th scope="row" className="px-4 py-3 text-left font-extrabold">합계</th>
                <td className="px-2.5 py-3 font-extrabold">{fmt(totals.counted)}회</td>
                <td className="py-3 pr-4 pl-2.5 font-extrabold text-brand-deep">{estimate(totals.counted)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p className="px-5 pb-4 text-[13px] text-muted">
        예상치 · 실제 지급액 아님{isSample ? " · 숫자는 예시 데이터" : ""}
      </p>
    </section>
  );
}

const PREVIEW_ROWS = 3;

function FileExport({ facts, songTitle, month, isSample }: Pick<MonthData, "facts" | "songTitle" | "month" | "isSample">) {
  const { rules } = useRules();
  const [unit, setUnit] = useState<ExportUnit>("song");
  const table = useMemo(() => exportTable(facts, rules, unit, songTitle), [facts, rules, unit, songTitle]);
  const title = csvTitleLine(month.label, rulesSummary(rules), isSample);

  return (
    <section aria-labelledby="ex-h" className={card}>
      <h2 id="ex-h" className="border-b border-line px-5 py-3.5 text-[17px] font-extrabold">파일 받기</h2>
      <div className="flex flex-wrap gap-5 p-5">
        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-4 text-sm">
          <div className="flex flex-col gap-1.5">
            <span className="font-extrabold text-muted">단위</span>
            <Segmented
              className="grid grid-cols-3"
              label="단위"
              options={(Object.keys(EXPORT_UNIT_LABEL) as ExportUnit[]).map((u) => ({
                label: EXPORT_UNIT_LABEL[u],
                active: unit === u,
                onClick: () => setUnit(u),
              }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-extrabold text-muted">기간</span>
            <span>{month.range} (한국 시간)</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-extrabold text-muted">제외 기준</span>
            <span>위 &quot;지금 쓰는 제외 기준&quot; 그대로</span>
          </div>
          <button
            type="button"
            disabled={table.rows.length === 0}
            onClick={() =>
              downloadCsv(`정산계산_${EXPORT_UNIT_LABEL[unit].replace(/\s/g, "")}_${month.key}.csv`, [title, table.header, ...table.rows])
            }
            className="flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-brand px-4 font-extrabold text-white hover:bg-brand-deep disabled:opacity-50"
          >
            <DownloadIcon />
            CSV로 받기 ({fmt(table.rows.length)}줄)
          </button>
          <p className="text-[13px] text-muted">CSV 는 엑셀에서 바로 열립니다. Excel(.xlsx) 파일은 아직 없습니다.</p>
        </div>

        <div className="flex min-w-0 flex-[999_1_420px] flex-col gap-2">
          <span className="text-sm font-extrabold text-muted">미리보기</span>
          <div className="overflow-hidden rounded-xl border border-line">
            <div className="border-b border-line bg-[#faf9fd] px-4 py-2.5 text-[13px] text-muted">맨 윗줄: {title[0]}</div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="text-left text-muted">
                    {table.header.map((h) => (
                      <th key={h} scope="col" className="px-3 py-2 font-extrabold whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.slice(0, PREVIEW_ROWS).map((r, i) => (
                    <tr key={i} className="border-t border-[#efedf6]">
                      {r.map((c, j) => (
                        <td key={j} className="px-3 py-2 whitespace-nowrap">
                          {typeof c === "number" ? fmt(c) : c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {table.rows.length > PREVIEW_ROWS && (
              <div className="border-t border-line px-4 py-2 text-[13px] text-muted">
                … 외 {fmt(table.rows.length - PREVIEW_ROWS)}줄
              </div>
            )}
            {table.rows.length === 0 && <div className="px-4 py-6 text-center text-sm text-muted">이 달에는 재생 기록이 없습니다.</div>}
          </div>
        </div>
      </div>
    </section>
  );
}

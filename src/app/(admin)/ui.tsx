"use client";

import Link from "next/link";

import { toCsv, type CsvCell } from "@/lib/csv";

import type { MonthInfo } from "./load-month";

export const fmt = (n: number) => n.toLocaleString("ko-KR");

/** 0.1원 단위 금액 "1,015.3원" */
export const won = (n: number) => `${n.toLocaleString("ko-KR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}원`;

/** 표를 5줄까지만 보여 주고 나머지는 더보기 */
export const ROW_LIMIT = 5;

type SegOption = { label: string; active: boolean; onClick: () => void };

export function Segmented({ label, options, className = "" }: { label: string; options: SegOption[]; className?: string }) {
  return (
    <div role="group" aria-label={label} className={`gap-0.5 rounded-[10px] bg-background p-[3px] ${className}`}>
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          aria-pressed={o.active}
          onClick={o.onClick}
          className={`min-h-9 rounded-[7px] px-2 text-[13px] font-extrabold whitespace-nowrap ${
            o.active ? "bg-surface text-brand-deep shadow-[0_1px_2px_rgba(28,25,48,.15)]" : "text-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function MonthPicker({ month, basePath }: { month: MonthInfo; basePath: string }) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
      <MonthButton label="이전 달" path="M15 18l-6-6 6-6" href={month.prev && `${basePath}?month=${month.prev}`} />
      <span className="px-2 text-xl font-extrabold">{month.label}</span>
      <MonthButton label="다음 달" path="M9 18l6-6-6-6" href={month.next && `${basePath}?month=${month.next}`} />
    </div>
  );
}

function MonthButton({ label, path, href }: { label: string; path: string; href: string | null }) {
  const icon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted" aria-hidden="true">
      <path d={path} />
    </svg>
  );
  const box = "flex size-10 items-center justify-center rounded-lg";
  if (!href) {
    return (
      <span aria-label={label} aria-disabled="true" className={`${box} opacity-40`}>
        {icon}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className={`${box} hover:bg-background`}>
      {icon}
    </Link>
  );
}

/** 표 맨 아래 "더보기 (N곡 더)" / "접기" 줄 */
export function MoreRow({
  colSpan,
  hidden,
  unit,
  expanded,
  onToggle,
}: {
  colSpan: number;
  hidden: number;
  unit: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (hidden <= 0) return null;
  return (
    <tr className="border-t border-[#efedf6]">
      <td colSpan={colSpan} className="p-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex min-h-12 w-full items-center justify-center gap-1.5 text-sm font-extrabold text-status-progress-fg hover:bg-[#faf9fd]"
        >
          {expanded ? "접기" : `더보기 (${hidden}${unit} 더)`}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={expanded ? "rotate-180" : ""}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </td>
    </tr>
  );
}

export function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
    </svg>
  );
}

export function downloadCsv(filename: string, lines: CsvCell[][]) {
  downloadFile(filename, new Blob([toCsv(lines)], { type: "text/csv;charset=utf-8" }));
}

export function downloadFile(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** 파일 맨 윗줄: 정산 확정이 아니라는 표시 + 달 + 기준 */
export function csvTitleLine(monthLabel: string, rules: string[], isSample: boolean): CsvCell[] {
  return [
    `계산 결과 (정산 확정 아님) · ${monthLabel} · 제외 기준: 같은 게시글 안 다시 재생 뺌${rules.length ? " / " + rules.join(" / ") : ""}${isSample ? " · 예시 데이터" : ""}`,
  ];
}

const kst = (iso: string) => new Date(new Date(iso).getTime() + 9 * 3_600_000).toISOString();

/** 한국 시간 "14:02:10" */
export const kstTime = (iso: string) => kst(iso).slice(11, 19);

/** 한국 시간 "10월 14일" */
export const kstDay = (iso: string) => {
  const k = kst(iso);
  return `${Number(k.slice(5, 7))}월 ${Number(k.slice(8, 10))}일`;
};

/** uuid 같은 긴 ID 는 앞 8자리만 */
export const shortId = (id: string) => (id.length > 12 ? id.slice(0, 8) : id);

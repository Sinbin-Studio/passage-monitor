"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  REPEAT_SEC_OPTIONS,
  summarizePlays,
  type ExcludeReason,
  type PlaybackGroupBy,
  type PlaybackRules,
  type PlaybackSummary,
} from "@/lib/playback";
import { exportTable, rulesSummary } from "@/lib/playback-export";

import type { MonthData } from "../load-month";
import { useRules } from "../rules-context";
import { DownloadIcon, MonthPicker, MoreRow, ROW_LIMIT, Segmented, csvTitleLine, downloadCsv, fmt, shortId } from "../ui";

/** uuid 같은 긴 녹음 ID 는 앞 8자리만 보여 준다 */
const recordingLabel = (id: string) => `녹음 ${shortId(id)}`;

export function PlaybackStatus({ facts, songTitle, asOf, month, isSample }: MonthData) {
  const { rules, setRules } = useRules();
  const [groupBy, setGroupBy] = useState<PlaybackGroupBy>("song");
  const [expanded, setExpanded] = useState(false);

  const summary = useMemo(() => summarizePlays(facts, rules, groupBy), [facts, rules, groupBy]);
  const { totals } = summary;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <MonthPicker month={month} basePath="/playback" />
        <span className="ml-auto text-[13px] text-muted">{asOf} 기준</span>
        <button
          type="button"
          onClick={() => {
            const t = exportTable(facts, rules, groupBy, songTitle);
            downloadCsv(`재생현황_${groupBy === "song" ? "곡별" : "녹음별"}_${month.key}.csv`, [
              csvTitleLine(month.label, rulesSummary(rules), isSample),
              t.header,
              ...t.rows,
            ]);
          }}
          className="flex min-h-11 items-center gap-2 rounded-[10px] bg-brand px-4 text-sm font-extrabold text-white hover:bg-brand-deep"
        >
          <DownloadIcon />
          CSV로 받기
        </button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        <div className="flex flex-col gap-1.5 rounded-2xl bg-brand-deep px-[22px] py-5 text-white">
          <span className="text-sm font-extrabold text-[#d9d0ff]">정산 대상 재생</span>
          <span className="text-[40px] leading-tight font-extrabold tracking-tight">{fmt(totals.counted)}</span>
          <span className="text-[13px] text-[#d9d0ff]">KOMCA 기준 등록 전 · 미리 보기</span>
        </div>
        <Kpi label="전체 재생" value={totals.raw} note="앱 기록 그대로" />
        <Kpi label="제외" labelClass="text-status-check-fg" value={totals.excluded} note="오른쪽 제외 기준에 해당" />
        <Kpi label="확인 필요" value={totals.check} note="판단할 기록이 빠진 재생" />
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <section aria-labelledby="tbl-h" className="min-w-0 flex-[999_1_600px] overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 border-b border-line px-5 py-3.5">
            <h2 id="tbl-h" className="text-[17px] font-extrabold">
              {groupBy === "song" ? "곡별 재생" : "녹음별 재생"}
            </h2>
            <Segmented
              className="ml-auto inline-flex"
              label="보기"
              options={[
                { label: "곡별", active: groupBy === "song", onClick: () => setGroupBy("song") },
                { label: "녹음별", active: groupBy === "recording", onClick: () => setGroupBy("recording") },
              ]}
            />
          </div>
          <PlaybackTable
            summary={summary}
            monthKey={month.key}
            groupBy={groupBy}
            songTitle={songTitle}
            expanded={expanded}
            onToggle={() => setExpanded((v) => !v)}
          />
          {summary.rows.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-muted">이 달에는 재생 기록이 없습니다.</p>
          )}
          {isSample && <p className="px-5 pt-3 pb-4 text-[13px] text-muted">예시 데이터 · Supabase 연결 정보 없음</p>}
        </section>

        <RulesPanel rules={rules} onChange={setRules} hits={summary.reasonHits} />
      </div>
    </div>
  );
}

function Kpi({ label, value, note, labelClass = "text-muted" }: { label: string; value: number; note: string; labelClass?: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface px-[22px] py-5">
      <span className={`text-sm font-extrabold ${labelClass}`}>{label}</span>
      <span className="text-[40px] leading-tight font-extrabold tracking-tight">{fmt(value)}</span>
      <span className="text-[13px] text-muted">{note}</span>
    </div>
  );
}

function PlaybackTable({
  summary,
  monthKey,
  groupBy,
  songTitle,
  expanded,
  onToggle,
}: {
  summary: PlaybackSummary;
  monthKey: string;
  groupBy: PlaybackGroupBy;
  songTitle: Record<string, string>;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hidden = summary.rows.length - ROW_LIMIT;
  const rows = expanded ? summary.rows : summary.rows.slice(0, ROW_LIMIT);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-[15px]">
        <thead>
          <tr className="bg-[#faf9fd] text-right text-[13px] text-muted">
            <th scope="col" className="px-5 py-3 text-left font-extrabold">{groupBy === "song" ? "곡" : "녹음"}</th>
            <th scope="col" className="px-2.5 py-3 font-extrabold text-brand-deep">정산 대상</th>
            <th scope="col" className="px-2.5 py-3 font-extrabold">전체 재생</th>
            <th scope="col" className="px-2.5 py-3 font-extrabold">제외</th>
            <th scope="col" className="py-3 pr-5 pl-2.5 font-extrabold">확인 필요</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-[#efedf6] text-right">
              <th scope="row" className="px-5 py-3.5 text-left font-normal">
                {groupBy === "song" ? (
                  <div className="font-extrabold">{songTitle[r.songKey] ?? r.key}</div>
                ) : (
                  <Link href={`/records?month=${monthKey}&post=${r.key}`} className="font-extrabold text-status-progress-fg hover:text-brand-deep">
                    {recordingLabel(r.key)} →
                  </Link>
                )}
                <div className="mt-0.5 text-[13px] text-muted">
                  {groupBy === "song" ? `녹음 ${r.recordingCount}개` : songTitle[r.songKey] ?? r.songKey}
                </div>
              </th>
              <td className="px-2.5 py-3.5 text-[17px] font-extrabold text-brand-deep">{fmt(r.counted)}</td>
              <td className="px-2.5 py-3.5 text-muted">{fmt(r.raw)}</td>
              <td className="px-2.5 py-3.5 text-status-check-fg">{fmt(r.excluded)}</td>
              <td className="py-3.5 pr-5 pl-2.5 text-muted">{fmt(r.check)}</td>
            </tr>
          ))}
          <MoreRow colSpan={5} hidden={hidden} unit={groupBy === "song" ? "곡" : "개"} expanded={expanded} onToggle={onToggle} />
        </tbody>
      </table>
    </div>
  );
}

type SwitchKey = "excludeSheet" | "excludeOwn" | "excludeReentry" | "excludeRepeat";

const SWITCHES: { key: SwitchKey; reason: ExcludeReason; title: string; hint: string }[] = [
  { key: "excludeSheet", reason: "sheet", title: '"이 곡의 기록" 시트에서 들은 것', hint: '"N번째 도전" → ▶ 미리 듣기' },
  { key: "excludeOwn", reason: "own", title: "자기 녹음을 직접 들은 것", hint: "올린 사람이 재생" },
  { key: "excludeReentry", reason: "reentry", title: "나갔다 들어와서 들은 것", hint: "같은 글에 다시 들어와 재생" },
  { key: "excludeRepeat", reason: "repeat", title: "빠르게 다시 들은 것", hint: "같은 녹음을 짧은 시간 안에 또 재생" },
];

function RulesPanel({
  rules,
  onChange,
  hits,
}: {
  rules: PlaybackRules;
  onChange: (r: PlaybackRules) => void;
  hits: Record<ExcludeReason, number>;
}) {
  const set = (patch: Partial<PlaybackRules>) => onChange({ ...rules, ...patch });

  return (
    <aside aria-labelledby="rule-h" className="min-w-0 flex-[1_1_320px] overflow-hidden rounded-2xl border border-line bg-surface">
      <h2 id="rule-h" className="border-b border-line px-5 py-4 text-[17px] font-extrabold">제외 기준</h2>

      <div className="flex flex-col gap-2.5 border-b border-line bg-[#faf9fd] px-5 py-3.5 text-sm">
        <div className="flex items-center gap-2 text-[13px] font-extrabold text-muted">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          항상 적용
        </div>
        <span>1초라도 재생하면 1번</span>
        <span>일시정지 · 댓글 시간 탭은 같은 재생</span>
        <div className="flex justify-between gap-2.5">
          <span>같은 게시글 안 다시 재생 제외</span>
          <span className="font-extrabold text-status-check-fg">−{fmt(hits.replay)}</span>
        </div>
      </div>

      {SWITCHES.map((s) => {
        const on = rules[s.key];
        return (
          <div key={s.key} className="flex flex-col gap-2.5 border-b border-[#efedf6] px-5 py-3.5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={s.title}
                onClick={() => set({ [s.key]: !on })}
                className={`relative h-[26px] w-11 flex-none rounded-full transition-colors ${on ? "bg-brand" : "bg-[#cfcbdc]"}`}
              >
                <span
                  className={`absolute top-[3px] size-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.2)] transition-[left] ${on ? "left-[21px]" : "left-[3px]"}`}
                />
              </button>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-extrabold">{s.title}</span>
                <span className="text-[13px] text-muted">{s.hint}</span>
              </div>
              {on && (
                <span className="text-[15px] font-extrabold whitespace-nowrap text-status-check-fg">
                  −{fmt(hits[s.reason])}
                </span>
              )}
            </div>
            {s.key === "excludeRepeat" && on && (
              <div className="flex flex-col gap-2">
                <Segmented
                  className="grid grid-cols-4"
                  label="시간"
                  options={REPEAT_SEC_OPTIONS.map((sec) => ({
                    label: `${sec}초`,
                    active: rules.repeatWithinSec === sec,
                    onClick: () => set({ repeatWithinSec: sec }),
                  }))}
                />
                <Segmented
                  className="grid grid-cols-2"
                  label="시간을 재는 기준"
                  options={[
                    { label: "앞 재생이 끝난 뒤", active: rules.repeatFrom === "prev_end", onClick: () => set({ repeatFrom: "prev_end" }) },
                    { label: "앞 재생 시작 뒤", active: rules.repeatFrom === "prev_start", onClick: () => set({ repeatFrom: "prev_start" }) },
                  ]}
                />
              </div>
            )}
          </div>
        );
      })}

      <p className="px-5 pt-3.5 pb-[18px] text-[13px] text-muted">
        여기서 바꾼 기준은 이 화면에서만 미리 보기로 쓰입니다. 저장은 아직 없습니다.
      </p>
    </aside>
  );
}

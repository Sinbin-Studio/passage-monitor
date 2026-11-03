"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { summarizePlays, type PlayStatus } from "@/lib/playback";
import { listenerSummaries, listenerTimeline, type TimelineData, type VisitBlock } from "@/lib/playback-timeline";

import type { MonthData, MonthInfo } from "../load-month";
import { useRules } from "../rules-context";
import { MonthPicker, MoreRow, ROW_LIMIT, Segmented, fmt, kstDay, kstTime, shortId } from "../ui";

const card = "min-w-0 overflow-hidden rounded-2xl border border-line bg-surface";

/** 녹음을 고르기 전: 그 달 재생된 녹음 목록 */
export function RecordingPicker({ facts, songTitle, month, isSample }: MonthData) {
  const { rules } = useRules();
  const [expanded, setExpanded] = useState(false);
  const { rows } = useMemo(() => summarizePlays(facts, rules, "recording"), [facts, rules]);
  const hidden = rows.length - ROW_LIMIT;
  const shown = expanded ? rows : rows.slice(0, ROW_LIMIT);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">재생 기록</h1>
        <div className="ml-auto">
          <MonthPicker month={month} basePath="/records" />
        </div>
      </div>
      <section aria-labelledby="pick-h" className={card}>
        <h2 id="pick-h" className="border-b border-line px-5 py-3.5 text-[17px] font-extrabold">
          녹음을 고르세요
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-[15px]">
            <thead>
              <tr className="bg-[#faf9fd] text-right text-[13px] text-muted">
                <th scope="col" className="px-5 py-3 text-left font-extrabold">녹음</th>
                <th scope="col" className="px-2.5 py-3 font-extrabold text-brand-deep">정산 대상</th>
                <th scope="col" className="px-2.5 py-3 font-extrabold">전체 재생</th>
                <th scope="col" className="py-3 pr-5 pl-2.5 font-extrabold">확인 필요</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.key} className="border-t border-[#efedf6] text-right">
                  <th scope="row" className="px-5 py-3.5 text-left font-normal">
                    <Link href={`/records?month=${month.key}&post=${r.key}`} className="font-extrabold text-status-progress-fg hover:text-brand-deep">
                      녹음 {shortId(r.key)} →
                    </Link>
                    <div className="mt-0.5 text-[13px] text-muted">{songTitle[r.songKey] ?? r.songKey}</div>
                  </th>
                  <td className="px-2.5 py-3.5 text-[17px] font-extrabold text-brand-deep">{fmt(r.counted)}</td>
                  <td className="px-2.5 py-3.5 text-muted">{fmt(r.raw)}</td>
                  <td className="py-3.5 pr-5 pl-2.5 text-muted">{fmt(r.check)}</td>
                </tr>
              ))}
              <MoreRow colSpan={4} hidden={hidden} unit="개" expanded={expanded} onToggle={() => setExpanded((v) => !v)} />
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted">이 달에는 재생 기록이 없습니다.</p>}
        {isSample && <p className="px-5 pt-3 pb-4 text-[13px] text-muted">예시 데이터 · 재생 흐름은 녹음 R-0142 만 있습니다</p>}
      </section>
    </div>
  );
}

type Filter = "all" | "excluded" | "check";

const STATUS_BADGE: Record<PlayStatus, { label: string; className: string }> = {
  counted: { label: "셈", className: "bg-brand-soft text-brand-deep" },
  excluded: { label: "뺌", className: "bg-status-check text-status-check-fg" },
  check: { label: "확인 필요", className: "bg-status-inactive text-status-inactive-fg" },
};

const SOURCE_LABEL = { post_detail: "게시글", song_history_sheet: '"이 곡의 기록" 시트' } as const;

export function RecordsView({
  month,
  postId,
  timeline,
  isSample,
}: {
  month: MonthInfo;
  postId: string;
  timeline: TimelineData | null;
  isSample: boolean;
}) {
  const { rules } = useRules();
  const [filter, setFilter] = useState<Filter>("all");
  const [picked, setPicked] = useState<string | null>(null);

  const listeners = useMemo(() => (timeline ? listenerSummaries(timeline, rules) : []), [timeline, rules]);
  const visible = listeners.filter((l) => filter === "all" || (filter === "excluded" ? l.excluded > 0 : l.check > 0));
  const selected = visible.find((l) => l.listenerId === picked) ?? visible[0] ?? null;
  const detail = timeline && selected ? listenerTimeline(timeline, selected.listenerId, rules) : null;

  const first = timeline?.sessions[0];
  const songLine = first ? [first.song_title, first.artist].filter(Boolean).join(" — ") || "곡 이름 없음" : "";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Link href={`/records?month=${month.key}`} className="text-sm font-extrabold text-status-progress-fg hover:text-brand-deep">
            ← 녹음 목록
          </Link>
          <h1 className="text-2xl font-extrabold">녹음 {shortId(postId)}</h1>
          {first && (
            <span className="text-sm text-muted">
              {songLine} · {month.label} 재생 {fmt(timeline!.sessions.length)}번
            </span>
          )}
        </div>
        <Segmented
          className="ml-auto inline-flex"
          label="들은 사람 거르기"
          options={[
            { label: "전체", active: filter === "all", onClick: () => setFilter("all") },
            { label: "뺀 것 있음", active: filter === "excluded", onClick: () => setFilter("excluded") },
            { label: "확인 필요 있음", active: filter === "check", onClick: () => setFilter("check") },
          ]}
        />
      </div>

      {!timeline || timeline.sessions.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-6 text-[15px]">
          <p className="font-extrabold">{month.label}에 이 녹음의 재생 기록이 없습니다.</p>
          {isSample && <p className="mt-1 text-sm text-muted">예시 데이터는 녹음 R-0142 만 있습니다.</p>}
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-5">
          <aside aria-labelledby="ls-h" className={`${card} flex-[1_1_240px]`}>
            <div className="flex items-baseline justify-between border-b border-line px-5 py-3.5">
              <h2 id="ls-h" className="text-[17px] font-extrabold">들은 사람</h2>
              <span className="text-xs text-muted">전체 → 정산 대상</span>
            </div>
            <ul>
              {visible.map((l) => {
                const on = l.listenerId === selected?.listenerId;
                return (
                  <li key={l.listenerId} className="border-b border-[#efedf6] last:border-0">
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => setPicked(l.listenerId)}
                      className={`flex min-h-12 w-full items-center gap-2 px-5 text-left text-[15px] ${on ? "bg-brand-soft" : "hover:bg-[#faf9fd]"}`}
                    >
                      <span className={`font-extrabold ${on ? "text-brand-deep" : ""}`}>{l.label}</span>
                      {l.isOwn && <span className="rounded-full bg-status-check px-2 py-0.5 text-xs font-extrabold text-status-check-fg">올린 사람</span>}
                      <span className="ml-auto font-extrabold whitespace-nowrap">
                        <span className="text-muted">{l.raw}</span> → <span className="text-brand-deep">{l.counted}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {visible.length === 0 && <li className="px-5 py-6 text-center text-sm text-muted">해당하는 사람이 없습니다.</li>}
            </ul>
            <p className="border-t border-line px-5 py-3 text-[13px] text-muted">앱 닉네임으로 표시합니다. 닉네임이 없으면 가명 ID.</p>
          </aside>

          {selected && detail && (
            <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-5">
              <section aria-labelledby="tl-h" className={card}>
                <div className="flex flex-wrap items-baseline gap-2 border-b border-line px-5 py-3.5">
                  <h2 id="tl-h" className="text-[17px] font-extrabold">
                    {selected.label} · 재생 흐름
                  </h2>
                  <span className="ml-auto text-[13px] text-muted">
                    들어옴 {detail.visits.length}번 · 재생 {detail.plays.length}번 · 한국 시간
                  </span>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3 p-5">
                  {detail.visits.map((v, i) => (
                    <VisitCard key={v.visitId} visit={v} index={i} />
                  ))}
                </div>
              </section>

              <section aria-labelledby="pr-h" className={card}>
                <div className="flex items-baseline gap-2 border-b border-line px-5 py-3.5">
                  <h2 id="pr-h" className="text-[17px] font-extrabold">재생별 결과</h2>
                  <span className="ml-auto text-sm font-extrabold">
                    <span className="text-muted">{selected.raw}</span> → <span className="text-brand-deep">{selected.counted}</span>
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#faf9fd] text-left text-[13px] text-muted">
                        <th scope="col" className="px-5 py-3 font-extrabold">재생</th>
                        <th scope="col" className="px-2.5 py-3 font-extrabold">어디서</th>
                        <th scope="col" className="px-2.5 py-3 font-extrabold">앞 재생</th>
                        <th scope="col" className="py-3 pr-5 pl-2.5 font-extrabold">결과</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.plays.map((p) => {
                        const badge = STATUS_BADGE[p.judgement.status];
                        return (
                          <tr key={p.playbackId} className="border-t border-[#efedf6]">
                            <th scope="row" className="px-5 py-3 text-left font-extrabold whitespace-nowrap">
                              재생 {p.no}
                              <div className="text-xs font-normal text-muted">
                                {kstDay(p.startedAt)} {kstTime(p.startedAt).slice(0, 5)}
                              </div>
                            </th>
                            <td className="px-2.5 py-3">{SOURCE_LABEL[p.source]}</td>
                            <td className="px-2.5 py-3">{p.prevText}</td>
                            <td className="py-3 pr-5 pl-2.5">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${badge.className}`}>{badge.label}</span>
                              {p.note && <span className="ml-2 text-[13px] text-muted">{p.note}</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="border-t border-line px-5 py-3 text-[13px] text-muted">
                  결과는 재생 현황에서 고른 제외 기준으로 계산합니다{isSample ? " · 예시 데이터" : ""}.
                </p>
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];

function VisitCard({ visit, index }: { visit: VisitBlock; index: number }) {
  const times = visit.items.map((i) => i.at).filter((t): t is string => t !== null);
  const start = times[0];
  const end = visit.items.find((i) => i.label === "나감")?.at;
  const title = visit.samePost ? "이 게시글" : `다른 게시글 ${shortId(visit.postId)}`;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line p-3.5">
      <div className="flex flex-col">
        <span className="text-sm font-extrabold">
          {CIRCLED[index] ?? `${index + 1}.`} {title}
        </span>
        {start && (
          <span className="text-xs text-muted">
            {kstDay(start)} {kstTime(start).slice(0, 5)} – {end ? kstTime(end).slice(0, 5) : ""}
          </span>
        )}
      </div>
      <ol className="flex flex-col gap-1 text-[13px]">
        {visit.items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span className="w-[62px] flex-none text-muted tabular-nums">{it.at ? kstTime(it.at) : "—"}</span>
            <span
              className={
                it.kind === "play"
                  ? "font-extrabold text-brand-deep"
                  : it.kind === "missing"
                    ? "font-extrabold text-status-check-fg"
                    : it.kind === "visit"
                      ? "text-muted"
                      : ""
              }
            >
              {it.label}
              {it.note && <span className="ml-1 font-normal text-muted">{it.note}</span>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

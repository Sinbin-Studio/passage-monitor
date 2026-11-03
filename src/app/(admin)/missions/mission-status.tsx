"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { missionExportFilename, missionWorkbook } from "@/lib/mission-export";
import {
  MISSION_GOALS,
  MISSION_LABEL,
  MISSION_STATUS_LABEL,
  ROLES,
  ROLE_LABEL,
  compareForScreen,
  missionProgress,
  missionsOf,
  nicknameOf,
  roleSummary,
  type MissionStatus,
  type MissionTester,
  type TesterRole,
} from "@/lib/missions";

import { DownloadIcon, Segmented, downloadFile } from "../ui";
import type { MissionData } from "./load-missions";

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const PILL: Record<MissionStatus, string> = {
  done: "bg-status-done text-white",
  inProgress: "bg-status-progress text-status-progress-fg",
  inactive: "bg-status-inactive text-status-inactive-fg",
};

export function MissionStatusView({ testers, since, asOf, isSample }: MissionData) {
  const [role, setRole] = useState<TesterRole | "all">("all");
  const [onlyOpen, setOnlyOpen] = useState(false);

  const sorted = [...testers].sort(compareForScreen);
  const total = ROLES.reduce(
    (acc, r) => {
      const s = roleSummary(testers, r);
      return { total: acc.total + s.total, done: acc.done + s.done };
    },
    { total: 0, done: 0 },
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-extrabold">미션 현황</h1>
          <p className="text-sm text-muted">
            구분별 목표 대비 달성 · 목표를 넘긴 개수는 진행률에 넣지 않음
            {isSample && " · 예시 데이터"}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <SinceFilter since={since} />
          <span className="text-[13px] text-muted">{asOf} 기준</span>
          <button
            type="button"
            onClick={() => {
              const bytes = missionWorkbook(testers, { now: new Date(), since, isSample });
              downloadFile(missionExportFilename(new Date()), new Blob([bytes as BlobPart], { type: XLSX_TYPE }));
            }}
            className="flex min-h-11 items-center gap-2 rounded-[10px] bg-brand px-4 text-sm font-extrabold text-white hover:bg-brand-deep"
          >
            <DownloadIcon />
            엑셀로 받기
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        <Tile label="전체" {...total} />
        {ROLES.map((r) => (
          <Tile key={r} label={ROLE_LABEL[r]} {...roleSummary(testers, r)} />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          className="inline-flex"
          label="구분"
          options={[
            { label: "전체", active: role === "all", onClick: () => setRole("all") },
            ...ROLES.map((r) => ({ label: ROLE_LABEL[r], active: role === r, onClick: () => setRole(r) })),
          ]}
        />
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={onlyOpen}
            onChange={(e) => setOnlyOpen(e.target.checked)}
            className="size-[18px] accent-brand"
          />
          미완료만 보기
        </label>
      </div>

      {ROLES.filter((r) => role === "all" || role === r).map((r) => (
        <RoleSection key={r} role={r} testers={sorted.filter((t) => t.role === r)} onlyOpen={onlyOpen} />
      ))}
    </div>
  );
}

function SinceFilter({ since }: { since: string | null }) {
  const router = useRouter();
  const go = (value: string) => router.push(value ? `/missions?since=${value}` : "/missions");
  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-2 text-[13px] font-extrabold text-muted">
        집계 시작
        <input
          type="date"
          value={since ?? ""}
          onChange={(e) => go(e.target.value)}
          className="min-h-10 rounded-[10px] border border-line bg-surface px-3 text-sm font-semibold text-foreground"
        />
      </label>
      {since ? (
        <button
          type="button"
          onClick={() => go("")}
          className="min-h-10 rounded-[10px] px-2 text-[13px] font-extrabold text-status-progress-fg hover:bg-brand-soft"
        >
          전체 기간
        </button>
      ) : (
        <span className="text-[13px] text-muted">전체 기간</span>
      )}
    </div>
  );
}

function Tile({ label, total, done }: { label: string; total: number; done: number }) {
  const pct = total ? Math.round((100 * done) / total) : 0;
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface px-[18px] py-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-extrabold text-muted">{label}</span>
        <span className="text-xs text-muted">{pct}%</span>
      </div>
      <div className="text-[28px] leading-tight font-extrabold tabular-nums">
        {done}
        <span className="text-base text-muted"> / {total}명 완료</span>
      </div>
      <Bar pct={pct} className="bg-status-done" />
    </div>
  );
}

function Bar({ pct, className, grow = false }: { pct: number; className: string; grow?: boolean }) {
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-status-inactive ${grow ? "flex-1" : ""}`}>
      <div className={`h-full ${className}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function RoleSection({ role, testers, onlyOpen }: { role: TesterRole; testers: MissionTester[]; onlyOpen: boolean }) {
  const keys = missionsOf(role);
  const { total, done } = roleSummary(testers, role);
  const rows = testers
    .map((t) => ({ t, p: missionProgress(t.role, t.counts) }))
    .filter(({ p }) => !onlyOpen || p.status !== "done");
  const headId = `mission-${role}`;

  return (
    <section aria-labelledby={headId} className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-5 py-4">
        <h2 id={headId} className="text-lg font-extrabold">
          {ROLE_LABEL[role]}
        </h2>
        <span className="text-sm text-muted">
          {total}명 · 완료 <b className="text-brand-deep">{done}명</b>
        </span>
        <span className="ml-auto text-[13px] text-muted">
          목표 {keys.map((k) => `${MISSION_LABEL[k]} ${MISSION_GOALS[role][k]}개`).join(" · ")}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-5 text-sm text-muted">{total === 0 ? "이 구분의 테스터가 없습니다." : "모두 완료했습니다."}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[#faf9fd] text-left text-xs font-extrabold whitespace-nowrap text-muted">
                <th className="border-b border-line px-3.5 py-2.5">닉네임</th>
                <th className="border-b border-line px-3.5 py-2.5">계정</th>
                {keys.map((k) => (
                  <th key={k} className="border-b border-line px-3.5 py-2.5 text-center">
                    {MISSION_LABEL[k]}
                  </th>
                ))}
                <th className="w-[220px] border-b border-line px-3.5 py-2.5">진행률</th>
                <th className="border-b border-line px-3.5 py-2.5">상태</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ t, p }, i) => (
                <tr key={`${t.account}-${i}`} className="border-b border-[#efedf6] whitespace-nowrap last:border-b-0">
                  <td className="px-3.5 py-2.5 font-extrabold">{nicknameOf(t)}</td>
                  <td className="px-3.5 py-2.5 text-[13px] text-muted">{t.account}</td>
                  {keys.map((k) => {
                    const n = t.counts[k];
                    const goal = MISSION_GOALS[role][k];
                    const s: MissionStatus = n >= goal ? "done" : n > 0 ? "inProgress" : "inactive";
                    return (
                      <td key={k} className="px-3.5 py-2.5 text-center">
                        <Pill status={s}>
                          {n} / {goal}
                        </Pill>
                      </td>
                    );
                  })}
                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Bar pct={p.percent} className="bg-brand" grow />
                      <span className="w-10 text-right text-[13px] font-extrabold tabular-nums">{p.percent}%</span>
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <Pill status={p.status}>{MISSION_STATUS_LABEL[p.status]}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Pill({ status, children }: { status: MissionStatus; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex min-w-16 items-center justify-center rounded-full px-2.5 py-1 text-[13px] font-extrabold tabular-nums ${PILL[status]}`}
    >
      {children}
    </span>
  );
}

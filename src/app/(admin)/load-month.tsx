import { redirect } from "next/navigation";
import { connection } from "next/server";

import type { PlaybackFact } from "@/lib/playback";
import {
  currentKstMonth,
  factsFromRows,
  kstMonthRange,
  shiftMonth,
  type PlaybackFactRow,
} from "@/lib/playback-rows";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

import type { TimelineData } from "@/lib/playback-timeline";

import { SAMPLE_SONG_TITLE, sampleFacts, sampleTimeline } from "./sample-data";

export type MonthInfo = {
  /** "2026-10" */
  key: string;
  /** "2026년 10월" */
  label: string;
  /** "2026.10.01 – 10.31" */
  range: string;
  prev: string | null;
  next: string | null;
};

export type MonthData = {
  facts: PlaybackFact[];
  songTitle: Record<string, string>;
  /** 불러온 시각 (예: "10.29 14:00") */
  asOf: string;
  month: MonthInfo;
  isSample: boolean;
};

function monthInfo(key: string, prev: string | null, next: string | null): MonthInfo {
  const [y, m] = key.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return { key, label: `${y}년 ${m}월`, range: `${y}.${mm}.01 – ${mm}.${last}`, prev, next };
}

function kstNowLabel(now: Date) {
  const k = new Date(now.getTime() + 9 * 3_600_000).toISOString();
  return `${k.slice(5, 7)}.${k.slice(8, 10)} ${k.slice(11, 16)}`;
}

/**
 * 고른 달(?month)의 재생 기록을 불러온다. 요청 데이터를 읽으므로 <Suspense> 안에서 부른다.
 * 로그인 안 했으면 /login 으로 보낸다. Supabase 연결 정보가 없으면 예시 데이터.
 */
export async function loadMonth(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<MonthData | { error: "not_admin" | "failed"; message: string }> {
  if (!hasSupabaseEnv()) {
    return {
      facts: sampleFacts(),
      songTitle: SAMPLE_SONG_TITLE,
      asOf: "10.29 14:00",
      month: monthInfo("2026-10", null, null),
      isSample: true,
    };
  }

  // 관리자 데이터는 요청마다 새로 그린다. Supabase 토큰 만료 확인(getClaims)과 아래 기준 시각이
  // 현재 시각(Date.now)을 읽는데, cacheComponents 의 미리 그리기 검사에서는 쿠키를 읽은 뒤에도
  // 현재 시각을 쓸 수 없다. connection() 뒤에서는 요청 시점에만 실행된다.
  await connection();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) redirect("/login");

  const { month: monthParam } = await searchParams;
  const now = new Date();
  const thisMonth = currentKstMonth(now);
  const key = typeof monthParam === "string" && kstMonthRange(monthParam) ? monthParam : thisMonth;
  const range = kstMonthRange(key)!;

  const { data, error } = await supabase.rpc("monitor_playback_facts", { p_from: range.from, p_to: range.to });
  if (error) {
    return { error: error.code === "42501" ? "not_admin" : "failed", message: error.message };
  }

  const { facts, songTitle } = factsFromRows((data ?? []) as PlaybackFactRow[]);
  const next = shiftMonth(key, 1);
  return {
    facts,
    songTitle,
    asOf: kstNowLabel(now),
    month: monthInfo(key, shiftMonth(key, -1), next <= thisMonth ? next : null),
    isSample: false,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 녹음(게시글) 하나의 그 달 재생 흐름. loadMonth 다음에 부른다 (세션 확인은 loadMonth 가 했다).
 * 녹음 ID 형식이 틀리면 null.
 */
export async function loadTimeline(
  postId: string,
  data: MonthData,
): Promise<TimelineData | null | { error: "not_admin" | "failed"; message: string }> {
  if (data.isSample) return sampleTimeline(postId);
  if (!UUID.test(postId)) return null;

  const range = kstMonthRange(data.month.key)!;
  const supabase = await createClient();
  const { data: result, error } = await supabase.rpc("monitor_playback_timeline", {
    p_post_id: postId,
    p_from: range.from,
    p_to: range.to,
  });
  if (error) {
    return { error: error.code === "42501" ? "not_admin" : "failed", message: error.message };
  }
  return result as TimelineData;
}

export function LoadError({ error, message }: { error: "not_admin" | "failed"; message: string }) {
  return (
    <div role="alert" className="rounded-2xl border border-line bg-surface p-6 text-[15px]">
      {error === "not_admin" ? (
        <>
          <p className="font-extrabold">이 계정은 관리자로 등록되어 있지 않습니다.</p>
          <p className="mt-1 text-sm text-muted">관리자 등록은 SQL Editor 에서 합니다 (supabase/monitor_playback_admin.sql 맨 아래).</p>
        </>
      ) : (
        <>
          <p className="font-extrabold">데이터를 불러오지 못했습니다.</p>
          <p className="mt-1 text-sm text-muted">{message}</p>
        </>
      )}
    </div>
  );
}

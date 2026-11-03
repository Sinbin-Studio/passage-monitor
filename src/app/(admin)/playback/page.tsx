import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadError, loadMonth } from "../load-month";
import { PlaybackStatus } from "./playback-status";

export const metadata: Metadata = {
  title: "재생 현황 · Passage 관리자",
};

export default function PlaybackPage({ searchParams }: PageProps<"/playback">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">불러오는 중…</p>}>
      <PlaybackData searchParams={searchParams} />
    </Suspense>
  );
}

async function PlaybackData({ searchParams }: { searchParams: PageProps<"/playback">["searchParams"] }) {
  const data = await loadMonth(searchParams);
  if ("error" in data) return <LoadError {...data} />;
  return <PlaybackStatus {...data} />;
}

import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadError, loadMonth, loadTimeline } from "../load-month";
import { RecordingPicker, RecordsView } from "./records-view";

export const metadata: Metadata = {
  title: "재생 기록 · Passage 관리자",
};

export default function RecordsPage({ searchParams }: PageProps<"/records">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">불러오는 중…</p>}>
      <RecordsData searchParams={searchParams} />
    </Suspense>
  );
}

async function RecordsData({ searchParams }: { searchParams: PageProps<"/records">["searchParams"] }) {
  const data = await loadMonth(searchParams);
  if ("error" in data) return <LoadError {...data} />;

  const { post } = await searchParams;
  if (typeof post !== "string" || post === "") return <RecordingPicker {...data} />;

  const timeline = await loadTimeline(post, data);
  if (timeline && "error" in timeline) return <LoadError {...timeline} />;
  return <RecordsView month={data.month} postId={post} timeline={timeline} isSample={data.isSample} />;
}

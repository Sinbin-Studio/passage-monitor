import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadError } from "../load-month";
import { loadMissions } from "./load-missions";
import { MissionStatusView } from "./mission-status";

export const metadata: Metadata = {
  title: "미션 · Passage 관리자",
};

export default function MissionsPage({ searchParams }: PageProps<"/missions">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">불러오는 중…</p>}>
      <MissionsData searchParams={searchParams} />
    </Suspense>
  );
}

async function MissionsData({ searchParams }: { searchParams: PageProps<"/missions">["searchParams"] }) {
  const data = await loadMissions(searchParams);
  if ("error" in data) return <LoadError {...data} />;
  return <MissionStatusView {...data} />;
}

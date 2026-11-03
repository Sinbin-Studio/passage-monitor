import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadError, loadMonth } from "../load-month";
import { SettlementView } from "./settlement-view";

export const metadata: Metadata = {
  title: "정산 · 파일 · Passage 관리자",
};

export default function SettlementPage({ searchParams }: PageProps<"/settlement">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">불러오는 중…</p>}>
      <SettlementData searchParams={searchParams} />
    </Suspense>
  );
}

async function SettlementData({ searchParams }: { searchParams: PageProps<"/settlement">["searchParams"] }) {
  const data = await loadMonth(searchParams);
  if ("error" in data) return <LoadError {...data} />;
  return <SettlementView {...data} />;
}

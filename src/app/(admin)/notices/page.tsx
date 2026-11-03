import type { Metadata } from "next";
import { Suspense } from "react";

import { loadNotices } from "./load-notices";
import { NoticesView } from "./notices-view";

export const metadata: Metadata = {
  title: "공지 · Passage 관리자",
};

export default function NoticesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">불러오는 중…</p>}>
      <NoticesData />
    </Suspense>
  );
}

async function NoticesData() {
  const data = await loadNotices();
  if ("error" in data) {
    return (
      <div role="alert" className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-6 text-[15px]">
        {data.error === "no_permission" ? (
          <>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-muted">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            <p className="text-lg font-extrabold">공지 권한이 없습니다</p>
            <p className="text-sm text-muted">이 계정은 공지를 보거나 쓸 수 없어요.</p>
          </>
        ) : (
          <>
            <p className="font-extrabold">공지를 불러오지 못했습니다.</p>
            <p className="text-sm text-muted">{data.message}</p>
          </>
        )}
      </div>
    );
  }
  return <NoticesView {...data} />;
}

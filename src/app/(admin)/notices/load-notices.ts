import { redirect } from "next/navigation";
import { connection } from "next/server";

import { storeLink, type Notice, type NoticeKind, type StoreLinks } from "@/lib/notices";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type NoticeData = {
  notices: Notice[];
  /** 업데이트 공지에 붙일 스토어 링크가 둘 다 설정돼 있는지 */
  linksReady: boolean;
  isSample: boolean;
};

/** monitor_notice_list() 한 줄 */
type NoticeRow = {
  notice_id: string;
  kind: string;
  title: string;
  summary: string;
  body: string | null;
  latest_version: string | null;
  android_url: string | null;
  ios_url: string | null;
  created_at: string;
};

/** 업데이트 공지에 붙이는 링크. 서버에서만 읽는다 (.env.example 참고). */
export function storeLinksFromEnv(): StoreLinks {
  return {
    androidUrl: storeLink(process.env.NOTICE_ANDROID_URL),
    iosUrl: storeLink(process.env.NOTICE_IOS_URL),
  };
}

function fromRow(r: NoticeRow): Notice {
  return {
    noticeId: r.notice_id,
    kind: (r.kind === "update" ? "update" : "info") as NoticeKind,
    title: r.title,
    summary: r.summary,
    body: r.body ?? "",
    latestVersion: r.latest_version,
    androidUrl: r.android_url,
    iosUrl: r.ios_url,
    createdAt: r.created_at,
  };
}

/**
 * 공지 목록을 불러온다. 요청 데이터를 읽으므로 <Suspense> 안에서 부른다.
 * 로그인 안 했으면 /login. 공지 권한이 없으면 no_permission. 연결 정보가 없으면 예시 데이터.
 */
export async function loadNotices(): Promise<NoticeData | { error: "no_permission" | "failed"; message: string }> {
  const links = storeLinksFromEnv();
  const linksReady = Boolean(links.androidUrl && links.iosUrl);

  if (!hasSupabaseEnv()) {
    return { notices: SAMPLE_NOTICES, linksReady, isSample: true };
  }

  await connection();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) redirect("/login");

  const { data, error } = await supabase.rpc("monitor_notice_list");
  if (error) {
    return { error: error.code === "42501" ? "no_permission" : "failed", message: error.message };
  }
  return { notices: ((data ?? []) as NoticeRow[]).map(fromRow), linksReady, isSample: false };
}

// 예시 데이터. Supabase 연결 정보가 없을 때 화면 확인용으로만 쓴다.
const SAMPLE_NOTICES: Notice[] = [
  {
    noticeId: "sample-3",
    kind: "update",
    title: "Passage 0.4.1 업데이트 안내",
    summary: "피드백을 400자까지 쓸 수 있어요.",
    body: "## 새로워진 점\n- 피드백을 400자까지 쓸 수 있어요.\n- 긴 피드백은 접어서 보여 줘요.",
    latestVersion: "0.4.1",
    androidUrl: "https://play.google.com/store/apps/details?id=example",
    iosUrl: "https://testflight.apple.com/join/example",
    createdAt: "2026-10-31T03:00:00Z",
  },
  {
    noticeId: "sample-2",
    kind: "info",
    title: "베타테스트 미션 안내",
    summary: "미션 진행 방법을 다시 알려 드려요.",
    body: "미션은 구분마다 달라요.\n## 일반인\n- 최초 녹음 2개, 재연습 1개",
    latestVersion: null,
    androidUrl: null,
    iosUrl: null,
    createdAt: "2026-10-28T03:00:00Z",
  },
  {
    noticeId: "sample-1",
    kind: "update",
    title: "Passage 0.4.0 업데이트 안내",
    summary: "알림이 피드백 · 유용해요 · 공지로 나뉘었어요.",
    body: "## 새로워진 점\n- 알림이 탭으로 나뉘었어요.\n## 바뀐 점\n- 좋아요 알림은 보내지 않아요.",
    latestVersion: "0.4.0",
    androidUrl: "https://play.google.com/store/apps/details?id=example",
    iosUrl: "https://testflight.apple.com/join/example",
    createdAt: "2026-10-25T03:00:00Z",
  },
];

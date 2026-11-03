// Passage 앱 공지(notices 표, Passage D-032) 쓰기 규칙. 화면 · Server Action 이 같이 쓴다. 순수 함수.
// 칸 제한은 Passage supabase/notification_rebuild.sql 의 check 와 같다.
// 본문 나누기는 Passage lib/features/notifications/domain/notice.dart 의 blocks 와 같다.

export type NoticeKind = "update" | "info";

export const NOTICE_KIND_LABEL: Record<NoticeKind, string> = {
  update: "업데이트",
  info: "안내",
};

export const TITLE_MAX = 100;
export const SUMMARY_MAX = 200;

/** DB 의 공지 한 건 */
export type Notice = {
  noticeId: string;
  kind: NoticeKind;
  title: string;
  summary: string;
  body: string;
  latestVersion: string | null;
  androidUrl: string | null;
  iosUrl: string | null;
  /** ISO 시각 */
  createdAt: string;
};

/** 쓰기 칸 */
export type NoticeDraft = {
  kind: NoticeKind;
  title: string;
  summary: string;
  body: string;
};

/** 업데이트 공지에 붙이는 스토어 링크 (환경 변수) */
export type StoreLinks = { androidUrl: string | null; iosUrl: string | null };

/** DB 에 넣는 값 */
export type NoticeInput = NoticeDraft & StoreLinks & { latestVersion: string | null };

const VERSION = /(?<![\d.])(\d+\.\d+\.\d+)(?![\d.])/;

/** 제목의 첫 x.y.z 버전. "Passage 0.4.2 업데이트 안내" → "0.4.2". 없으면 null. */
export function versionFromTitle(title: string): string | null {
  return VERSION.exec(title)?.[1] ?? null;
}

/** 공백 · 빈 문자열이면 null, https 가 아니면 null */
export function storeLink(value: string | undefined | null): string | null {
  const v = value?.trim();
  return v && v.startsWith("https://") ? v : null;
}

/** 글자 수 (DB 의 char_length 와 같게 코드 포인트로 센다) */
export const charCount = (s: string) => Array.from(s.trim()).length;

export type NoticeCheck = { ok: true; input: NoticeInput } | { ok: false; errors: string[] };

/**
 * 게시 · 저장 전에 확인한다. 업데이트 공지는 제목에서 버전을 찾고, 스토어 링크가 둘 다 있어야 한다.
 * 안내 공지에는 버전 · 링크를 넣지 않는다.
 */
export function checkNotice(draft: NoticeDraft, links: StoreLinks): NoticeCheck {
  const errors: string[] = [];
  const title = draft.title.trim();
  const summary = draft.summary.trim();
  const body = draft.body.replace(/\r\n/g, "\n").trim();

  if (draft.kind !== "update" && draft.kind !== "info") errors.push("종류를 골라 주세요.");
  if (charCount(title) === 0) errors.push("제목을 써 주세요.");
  else if (charCount(title) > TITLE_MAX) errors.push(`제목은 ${TITLE_MAX}자까지 쓸 수 있어요.`);
  if (charCount(summary) === 0) errors.push("요약을 써 주세요.");
  else if (charCount(summary) > SUMMARY_MAX) errors.push(`요약은 ${SUMMARY_MAX}자까지 쓸 수 있어요.`);

  let latestVersion: string | null = null;
  let androidUrl: string | null = null;
  let iosUrl: string | null = null;
  if (draft.kind === "update") {
    latestVersion = versionFromTitle(title);
    if (!latestVersion) errors.push("업데이트 공지는 제목에 새 버전을 넣어 주세요. (예: Passage 0.4.2 업데이트 안내)");
    androidUrl = storeLink(links.androidUrl);
    iosUrl = storeLink(links.iosUrl);
    if (!androidUrl || !iosUrl) errors.push("스토어 링크 설정이 없어 업데이트 공지를 올릴 수 없어요. 관리자에게 환경 변수 설정을 요청하세요.");
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, input: { kind: draft.kind, title, summary, body, latestVersion, androidUrl, iosUrl } };
}

export type NoticeBlock = { type: "heading" | "bullet" | "paragraph"; text: string };

/** 본문을 앱처럼 '## 소제목', '- 점 목록', 나머지 문단으로 나눈다. 빈 줄은 버린다. */
export function noticeBlocks(body: string): NoticeBlock[] {
  return body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((line) => {
      if (line.startsWith("## ")) return { type: "heading", text: line.slice(3).trim() };
      if (line.startsWith("- ")) return { type: "bullet", text: line.slice(2).trim() };
      return { type: "paragraph", text: line };
    });
}

/** 앱 공지 상세의 날짜 "2026년 11월 3일" (한국 시간) */
export function noticeDate(iso: string) {
  const k = new Date(new Date(iso).getTime() + 9 * 3_600_000);
  return `${k.getUTCFullYear()}년 ${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일`;
}

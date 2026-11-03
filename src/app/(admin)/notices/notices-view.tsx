"use client";

import { useState, useTransition } from "react";

import {
  NOTICE_KIND_LABEL,
  SUMMARY_MAX,
  TITLE_MAX,
  charCount,
  checkNotice,
  noticeBlocks,
  noticeDate,
  versionFromTitle,
  type Notice,
  type NoticeDraft,
  type NoticeKind,
} from "@/lib/notices";

import { Segmented } from "../ui";
import { createNotice, deleteNotice, updateNotice, type ActionResult } from "./actions";
import type { NoticeData } from "./load-notices";

const EMPTY: NoticeDraft = { kind: "update", title: "", summary: "", body: "" };

const draftOf = (n: Notice): NoticeDraft => ({ kind: n.kind, title: n.title, summary: n.summary, body: n.body });

/** 화면에서 미리 확인할 때 쓰는 링크 자리. 실제 링크는 서버(Server Action)가 환경 변수에서 넣는다. */
const linksForCheck = (ready: boolean) =>
  ready ? { androidUrl: "https://set", iosUrl: "https://set" } : { androidUrl: null, iosUrl: null };

const KIND_CHIP: Record<NoticeKind, string> = {
  update: "bg-[#dff6ec] text-[#1f7a5a]",
  info: "bg-[#ede8fd] text-[#4e27f0]",
};

export function NoticesView({ notices, linksReady, isSample }: NoticeData) {
  // "new" = 새 공지, 그 밖에는 고치는 공지 id
  const [selected, setSelected] = useState<string>("new");
  const [editorKey, setEditorKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Notice | null>(null);

  const editing = selected === "new" ? null : (notices.find((n) => n.noticeId === selected) ?? null);
  const startNew = () => {
    setSelected("new");
    setEditorKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col gap-4">
      {isSample && (
        <p className="rounded-xl bg-status-check px-4 py-3 text-sm font-semibold text-status-check-fg">
          예시 데이터입니다. Supabase 연결 정보가 없어 게시 · 고치기 · 지우기는 동작하지 않습니다.
        </p>
      )}
      {message && (
        <p role="status" className="rounded-xl bg-brand-soft px-4 py-3 text-sm font-extrabold text-brand-deep">
          {message}
        </p>
      )}

      <div className="flex flex-wrap items-start gap-5">
        <section aria-labelledby="notice-list-h" className="min-w-0 flex-[1_1_340px] overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="flex items-center gap-2.5 border-b border-line px-[18px] py-4">
            <h2 id="notice-list-h" className="text-[17px] font-extrabold">
              올린 공지
            </h2>
            <span className="text-[13px] text-muted">{notices.length}건</span>
            <button
              type="button"
              onClick={() => {
                setMessage(null);
                startNew();
              }}
              className="ml-auto min-h-10 rounded-[10px] bg-brand px-3.5 text-sm font-extrabold text-white hover:bg-brand-deep"
            >
              + 새 공지
            </button>
          </div>
          <ul>
            {selected === "new" && (
              <li className="flex flex-col gap-1.5 border-b border-[#efecf6] bg-brand-soft px-[18px] py-3.5">
                <span className="text-xs font-extrabold text-brand-deep">새 공지 · 작성 중</span>
              </li>
            )}
            {notices.length === 0 && <li className="px-[18px] py-5 text-sm text-muted">아직 올린 공지가 없습니다.</li>}
            {notices.map((n) => {
              const on = n.noticeId === selected;
              return (
                <li key={n.noticeId} className={`flex items-start gap-1 border-b border-[#efecf6] last:border-b-0 ${on ? "bg-brand-soft" : ""}`}>
                  <button
                    type="button"
                    aria-current={on ? "true" : undefined}
                    onClick={() => {
                      setMessage(null);
                      setSelected(n.noticeId);
                    }}
                    className="flex min-w-0 flex-1 flex-col gap-1.5 px-[18px] py-3.5 text-left hover:bg-[#faf9fd]"
                  >
                    <span className="flex items-center gap-2">
                      <KindChip kind={n.kind} />
                      <span className="text-xs text-muted">{noticeDate(n.createdAt)}</span>
                    </span>
                    <span className="text-[15px] font-extrabold">{n.title}</span>
                    <span className="truncate text-[13px] text-muted">{n.summary}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`${n.title} 지우기`}
                    onClick={() => setDeleting(n)}
                    className="mt-3 mr-2 flex size-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-status-check hover:text-status-check-fg"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <Editor
          key={editing ? editing.noticeId : `new-${editorKey}`}
          notice={editing}
          linksReady={linksReady}
          onDone={(text, next) => {
            setMessage(text);
            if (next === "new") startNew();
          }}
        />
      </div>

      {deleting && (
        <DeleteDialog
          notice={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            setMessage(`"${deleting.title}" 공지를 지웠어요.`);
            if (selected === deleting.noticeId) startNew();
          }}
        />
      )}
    </div>
  );
}

function KindChip({ kind }: { kind: NoticeKind }) {
  return <span className={`rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wide ${KIND_CHIP[kind]}`}>{NOTICE_KIND_LABEL[kind]}</span>;
}

function Editor({
  notice,
  linksReady,
  onDone,
}: {
  notice: Notice | null;
  linksReady: boolean;
  onDone: (message: string, next: "new" | "stay") => void;
}) {
  const [draft, setDraft] = useState<NoticeDraft>(notice ? draftOf(notice) : EMPTY);
  const [confirming, setConfirming] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof NoticeDraft>(key: K, value: NoticeDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const check = checkNotice(draft, linksForCheck(linksReady));
  const version = versionFromTitle(draft.title);
  const isNew = notice === null;

  const submit = () =>
    startTransition(async () => {
      const result: ActionResult = isNew ? await createNotice(draft) : await updateNotice(notice.noticeId, draft);
      setConfirming(false);
      if (result.ok) {
        setErrors([]);
        onDone(isNew ? `"${draft.title.trim()}" 공지를 게시했어요. 푸시가 나갔어요.` : "고친 내용을 저장했어요.", isNew ? "new" : "stay");
      } else {
        setErrors(result.errors);
      }
    });

  return (
    <section aria-labelledby="notice-edit-h" className="flex min-w-0 flex-[999_1_640px] flex-wrap gap-6 rounded-2xl border border-line bg-surface p-[22px]">
      <form
        className="flex min-w-0 flex-[999_1_340px] flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (check.ok) setConfirming(true);
        }}
      >
        <div className="flex flex-col gap-1">
          <h2 id="notice-edit-h" className="text-xl font-extrabold">
            {isNew ? "새 공지" : "공지 고치기"}
          </h2>
          {!isNew && <p className="text-[13px] text-muted">{noticeDate(notice.createdAt)} 게시 · 고쳐도 푸시는 다시 가지 않아요</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-extrabold text-muted">종류</span>
          <Segmented
            className="inline-flex self-start"
            label="종류"
            options={(["update", "info"] as const).map((k) => ({
              label: NOTICE_KIND_LABEL[k],
              active: draft.kind === k,
              onClick: () => set("kind", k),
            }))}
          />
        </div>

        <Field label="제목" count={charCount(draft.title)} max={TITLE_MAX}>
          <input value={draft.title} onChange={(e) => set("title", e.target.value)} className={INPUT} placeholder="Passage 0.4.2 업데이트 안내" />
        </Field>

        {draft.kind === "update" &&
          (!linksReady ? (
            <Hint tone="warn">스토어 링크 설정(NOTICE_ANDROID_URL · NOTICE_IOS_URL)이 없어 업데이트 공지를 올릴 수 없어요.</Hint>
          ) : version ? (
            <Hint tone="ok">
              제목에서 새 버전 <b>{version}</b> 을 찾았어요 · Play 스토어 · TestFlight 링크는 설정값으로 들어가요
            </Hint>
          ) : (
            <Hint tone="warn">업데이트 공지는 제목에 새 버전을 넣어 주세요. (예: Passage 0.4.2 업데이트 안내)</Hint>
          ))}

        <Field label="요약 (알림 목록 · 푸시 본문)" count={charCount(draft.summary)} max={SUMMARY_MAX}>
          <input value={draft.summary} onChange={(e) => set("summary", e.target.value)} className={INPUT} />
        </Field>

        <label className="flex flex-col gap-1.5">
          <span className="flex justify-between text-[13px] font-extrabold text-muted">
            본문<span className="font-semibold">## 소제목 · - 점 목록 · 나머지는 문단</span>
          </span>
          <textarea value={draft.body} onChange={(e) => set("body", e.target.value)} rows={10} className={`${INPUT} resize-y leading-relaxed`} />
        </label>

        {errors.length > 0 && (
          <ul role="alert" className="flex flex-col gap-1 rounded-xl bg-status-check px-4 py-3 text-sm font-semibold text-status-check-fg">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {isNew && <span className="text-[13px] font-semibold text-status-check-fg">게시하면 로그인한 모든 사용자에게 푸시가 바로 가요</span>}
          <button
            type="submit"
            disabled={!check.ok || pending}
            className="ml-auto min-h-11 rounded-[10px] bg-brand px-5 text-sm font-extrabold text-white hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isNew ? "게시하기" : "저장하기"}
          </button>
        </div>
      </form>

      <PhonePreview draft={draft} version={draft.kind === "update" ? version : null} createdAt={notice?.createdAt ?? null} />

      {confirming && (
        <Dialog label={isNew ? "공지 게시 확인" : "공지 저장 확인"} onClose={() => !pending && setConfirming(false)}>
          <b className="text-lg">{isNew ? "공지를 게시할까요?" : "고친 내용을 저장할까요?"}</b>
          {isNew ? (
            <>
              <p className="text-sm leading-relaxed text-muted">
                로그인하고 푸시를 켠 <b className="text-foreground">모든 사용자</b>에게 바로 푸시가 가요. 보낸 푸시는 되돌릴 수 없어요.
              </p>
              <div className="flex flex-col gap-0.5 rounded-xl bg-[#2b2933] p-3 text-[13px] text-white">
                <b>[공지] {draft.title.trim()}</b>
                <span className="text-[#d8d6e0]">{draft.summary.trim()}</span>
              </div>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-muted">앱 공지에는 바로 반영되고, 푸시는 다시 가지 않아요.</p>
          )}
          <DialogButtons
            pending={pending}
            onCancel={() => setConfirming(false)}
            onConfirm={submit}
            confirmLabel={isNew ? "게시하고 푸시 보내기" : "저장"}
          />
        </Dialog>
      )}
    </section>
  );
}

const INPUT = "min-h-11 rounded-[10px] border border-line bg-surface px-3 py-2.5 text-[15px] text-foreground";

function Field({ label, count, max, children }: { label: string; count: number; max: number; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex justify-between text-[13px] font-extrabold text-muted">
        {label}
        <span className={`font-semibold tabular-nums ${count > max ? "text-status-check-fg" : ""}`}>
          {count} / {max}
        </span>
      </span>
      {children}
    </label>
  );
}

function Hint({ tone, children }: { tone: "ok" | "warn"; children: React.ReactNode }) {
  return (
    <p
      className={`rounded-[10px] px-3 py-2.5 text-[13px] font-semibold ${
        tone === "ok" ? "bg-[#dff6ec] text-[#1f5f47]" : "bg-status-check text-status-check-fg"
      }`}
    >
      {children}
    </p>
  );
}

/** 앱 공지 상세 화면처럼 (Passage notice_detail_screen.dart) */
function PhonePreview({ draft, version, createdAt }: { draft: NoticeDraft; version: string | null; createdAt: string | null }) {
  const blocks = noticeBlocks(draft.body);
  return (
    <div className="flex flex-[1_1_280px] flex-col items-center gap-2.5">
      <span className="self-start text-[13px] font-extrabold text-muted">앱에서 보이는 모습</span>
      <div className="flex h-[560px] w-[280px] flex-col overflow-hidden rounded-[36px] border-8 border-foreground bg-[#fbfaf8] text-[#1a1a1a]">
        <div className="px-[18px] pt-[18px] pb-2 text-[15px] font-bold">공지</div>
        <div className="flex flex-1 flex-col overflow-y-auto px-[18px] pb-4">
          <span className="self-start">
            <KindChip kind={draft.kind} />
          </span>
          <span className="mt-2.5 text-xl leading-snug font-extrabold break-keep">{draft.title.trim() || "제목"}</span>
          <span className="mt-2 text-[11px] text-[#6f6f78]">{noticeDate(createdAt ?? new Date().toISOString())} · Passage 팀</span>
          <div className="mt-3.5 h-px bg-[#ece9f2]" />
          {blocks.map((b, i) =>
            b.type === "heading" ? (
              <span key={i} className="mt-4 text-[13px] font-extrabold">
                {b.text}
              </span>
            ) : b.type === "bullet" ? (
              <span key={i} className="mt-2 flex gap-2 text-xs leading-relaxed break-keep">
                <span className="mt-[7px] size-[5px] shrink-0 rounded-full bg-[#4e27f0]" />
                {b.text}
              </span>
            ) : (
              <span key={i} className="mt-4 text-xs leading-relaxed break-keep text-[#4a4a52]">
                {b.text}
              </span>
            ),
          )}
        </div>
        {version && (
          <div className="flex flex-col items-center gap-2 border-t border-[#ece9f2] bg-white px-3.5 pt-3 pb-4">
            <span className="text-[11px] text-[#6f6f78]">
              앱이 이전 버전이면 <b className="text-[#4e27f0]">새 버전 {version}</b> 안내가 붙어요
            </span>
            <span className="flex h-10 w-full items-center justify-center rounded-full bg-[#4e27f0] text-[13px] font-extrabold text-white">업데이트하기</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DeleteDialog({ notice, onClose, onDeleted }: { notice: Notice; onClose: () => void; onDeleted: () => void }) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);
  return (
    <Dialog label="공지 지우기 확인" onClose={() => !pending && onClose()}>
      <b className="text-lg">이 공지를 지울까요?</b>
      <p className="text-sm font-extrabold">{notice.title}</p>
      <p className="text-sm leading-relaxed text-muted">앱 공지 목록에서 사라지고 되돌릴 수 없어요. 이미 보낸 푸시는 회수되지 않아요.</p>
      {errors.length > 0 && (
        <p role="alert" className="rounded-lg bg-status-check px-3 py-2 text-sm font-semibold text-status-check-fg">
          {errors.join(" ")}
        </p>
      )}
      <DialogButtons
        pending={pending}
        danger
        onCancel={onClose}
        confirmLabel="지우기"
        onConfirm={() =>
          startTransition(async () => {
            const r = await deleteNotice(notice.noticeId);
            if (r.ok) onDeleted();
            else setErrors(r.errors);
          })
        }
      />
    </Dialog>
  );
}

function Dialog({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(28,25,48,0.45)] p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-label={label} className="flex w-full max-w-[400px] flex-col gap-3.5 rounded-[18px] bg-surface p-[22px] shadow-xl">
        {children}
      </div>
    </div>
  );
}

function DialogButtons({
  pending,
  danger = false,
  onCancel,
  onConfirm,
  confirmLabel,
}: {
  pending: boolean;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
}) {
  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="min-h-11 rounded-[10px] border border-line bg-surface px-4 text-sm font-extrabold text-muted disabled:opacity-40"
      >
        취소
      </button>
      <button
        type="button"
        autoFocus
        onClick={onConfirm}
        disabled={pending}
        className={`min-h-11 rounded-[10px] px-4 text-sm font-extrabold text-white disabled:opacity-60 ${
          danger ? "bg-[#b3261e] hover:bg-[#8c1d17]" : "bg-brand hover:bg-brand-deep"
        }`}
      >
        {pending ? "처리 중…" : confirmLabel}
      </button>
    </div>
  );
}

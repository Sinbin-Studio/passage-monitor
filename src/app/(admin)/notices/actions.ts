"use server";

import { refresh } from "next/cache";

import { checkNotice, type NoticeDraft } from "@/lib/notices";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

import { storeLinksFromEnv } from "./load-notices";

export type ActionResult = { ok: true } | { ok: false; errors: string[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 세션 확인. 공지 권한은 DB 함수가 확인한다 (is_notice_admin). */
async function client(): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; error?: never } | { supabase?: never; error: string }> {
  if (!hasSupabaseEnv()) return { error: "예시 데이터 화면에서는 저장할 수 없어요." };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) return { error: "로그인이 풀렸어요. 다시 로그인해 주세요." };
  return { supabase };
}

function failed(error: { code?: string; message: string }): ActionResult {
  if (error.code === "42501") return { ok: false, errors: ["공지 권한이 없습니다."] };
  if (error.code === "P0002") return { ok: false, errors: ["이미 지워진 공지예요. 목록을 새로 불러왔어요."] };
  return { ok: false, errors: [`저장하지 못했어요: ${error.message}`] };
}

/** 새 공지. DB 에 들어가는 순간 Passage Webhook 이 모든 기기에 푸시를 보낸다. */
export async function createNotice(draft: NoticeDraft): Promise<ActionResult> {
  const checked = checkNotice(draft, storeLinksFromEnv());
  if (!checked.ok) return checked;
  const c = await client();
  if (!c.supabase) return { ok: false, errors: [c.error] };

  const n = checked.input;
  const { error } = await c.supabase.rpc("monitor_notice_create", {
    p_kind: n.kind,
    p_title: n.title,
    p_summary: n.summary,
    p_body: n.body,
    p_latest_version: n.latestVersion,
    p_android_url: n.androidUrl,
    p_ios_url: n.iosUrl,
  });
  if (error) return failed(error);
  refresh();
  return { ok: true };
}

/** 고치기. 푸시는 다시 가지 않는다. */
export async function updateNotice(noticeId: string, draft: NoticeDraft): Promise<ActionResult> {
  if (!UUID.test(noticeId)) return { ok: false, errors: ["공지를 찾지 못했어요."] };
  const checked = checkNotice(draft, storeLinksFromEnv());
  if (!checked.ok) return checked;
  const c = await client();
  if (!c.supabase) return { ok: false, errors: [c.error] };

  const n = checked.input;
  const { error } = await c.supabase.rpc("monitor_notice_update", {
    p_notice_id: noticeId,
    p_kind: n.kind,
    p_title: n.title,
    p_summary: n.summary,
    p_body: n.body,
    p_latest_version: n.latestVersion,
    p_android_url: n.androidUrl,
    p_ios_url: n.iosUrl,
  });
  if (error) {
    if (error.code === "P0002") refresh();
    return failed(error);
  }
  refresh();
  return { ok: true };
}

/** 지우기. 읽음 기록도 함께 지워진다. 이미 보낸 푸시는 회수되지 않는다. */
export async function deleteNotice(noticeId: string): Promise<ActionResult> {
  if (!UUID.test(noticeId)) return { ok: false, errors: ["공지를 찾지 못했어요."] };
  const c = await client();
  if (!c.supabase) return { ok: false, errors: [c.error] };

  const { error } = await c.supabase.rpc("monitor_notice_delete", { p_notice_id: noticeId });
  if (error) {
    if (error.code === "P0002") refresh();
    return failed(error);
  }
  refresh();
  return { ok: true };
}

// 재생 기록 화면: 녹음 하나의 재생을 들은 사람별 · 방문별 흐름으로 묶는다. 순수 함수.
// 입력은 DB 함수 monitor_playback_timeline() 의 결과 (supabase/monitor_playback_timeline.sql).

import {
  EXCLUDE_REASON_LABEL,
  MISSING_INFO_LABEL,
  judgePlay,
  type PlayJudgement,
  type PlaybackRules,
  type PlaySource,
} from "./playback";
import { factsFromRows, type PlaybackFactRow } from "./playback-rows";

export type TimelineSessionRow = PlaybackFactRow & {
  listener_id: string;
  /** profiles.username. 닉네임을 안 정했으면 null */
  nickname: string | null;
  /** 탈퇴해 계정 연결이 끊겼으면 false */
  account_exists: boolean;
  visit_id: string;
  visit_post_id: string;
  ended_at: string | null;
  end_type: string | null;
  prev_end_type: string | null;
  gap_exit_to_reenter_ms: number | null;
};

export type TimelineEventRow = {
  event_type: string;
  occurred_at: string;
  visit_id: string | null;
  playback_id: string | null;
  post_id: string | null;
  position_ms: number | null;
  seek_from_ms: number | null;
};

export type TimelineData = {
  sessions: TimelineSessionRow[];
  events: TimelineEventRow[];
};

/** 가명 청취자 ID 를 짧게: "p_7f3a". 닉네임이 없을 때 구분용 */
export const listenerCode = (listenerId: string) => `p_${listenerId.replace(/-/g, "").slice(0, 4)}`;

/** 화면에 보일 들은 사람 이름: 닉네임, 없으면 상태 + 가명 */
export function listenerLabel(s: Pick<TimelineSessionRow, "listener_id" | "nickname" | "account_exists">): string {
  if (s.nickname) return s.nickname;
  // 닉네임을 넘기기 전 버전의 DB 함수면 두 값이 없다 → 가명만.
  if (s.nickname === undefined || s.account_exists === undefined) return listenerCode(s.listener_id);
  return `${s.account_exists ? "닉네임 없음" : "탈퇴한 사용자"} (${listenerCode(s.listener_id)})`;
}

/** 120_000 → "2분", 3_000 → "3초", 222_000 → "3분 42초" */
export function durationLabel(ms: number): string {
  const s = Math.round(Math.abs(ms) / 1000);
  if (s < 60) return `${s}초`;
  if (s < 3600) return `${Math.floor(s / 60)}분${s % 60 ? ` ${s % 60}초` : ""}`;
  const m = Math.floor((s % 3600) / 60);
  return `${Math.floor(s / 3600)}시간${m ? ` ${m}분` : ""}`;
}

/** 위치 ms → "1:05" */
const positionLabel = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export type ListenerSummary = {
  listenerId: string;
  label: string;
  /** 이 녹음을 올린 사람 */
  isOwn: boolean;
  raw: number;
  counted: number;
  excluded: number;
  check: number;
};

/** 들은 사람마다 전체 재생 → 정산 대상. 많이 들은 순 */
export function listenerSummaries(data: TimelineData, rules: PlaybackRules): ListenerSummary[] {
  const { facts } = factsFromRows(data.sessions);
  const byId = new Map<string, ListenerSummary>();
  data.sessions.forEach((s, i) => {
    let l = byId.get(s.listener_id);
    if (!l) {
      l = { listenerId: s.listener_id, label: listenerLabel(s), isOwn: false, raw: 0, counted: 0, excluded: 0, check: 0 };
      byId.set(s.listener_id, l);
    }
    if (s.is_own) l.isOwn = true;
    l.raw++;
    l[judgePlay(facts[i], rules).status]++;
  });
  return [...byId.values()].sort((a, b) => b.raw - a.raw || a.label.localeCompare(b.label));
}

export type TimelineItem = {
  /** ISO 시각. 끝 기록 없음은 null */
  at: string | null;
  label: string;
  kind: "visit" | "play" | "event" | "missing";
  /** 재생 N 의 N */
  playNo?: number;
  note?: string;
};

export type VisitBlock = {
  visitId: string;
  /** 방문한 게시글. 이 녹음이 아니면 "이 곡의 기록" 시트에서 들은 것 */
  postId: string;
  samePost: boolean;
  items: TimelineItem[];
};

export type PlayResult = {
  no: number;
  playbackId: string;
  source: PlaySource;
  startedAt: string;
  prevText: string;
  judgement: PlayJudgement;
  /** 결과 옆 짧은 설명 */
  note: string;
};

const EVENT_LABEL: Record<string, string> = {
  visit_enter: "들어옴",
  visit_exit: "나감",
  pause: "일시정지",
  resume: "이어 듣기",
  seek: "위치 이동",
  progress: "듣는 중",
  complete: "끝까지 들음",
  stop: "멈춤",
};

function prevText(s: TimelineSessionRow): string {
  const ended = (gap: number | null) =>
    gap === null ? "앞 재생 끝 기록 없음" : gap < 0 ? "앞 재생과 겹침" : `앞 재생 끝나고 ${durationLabel(gap)} 뒤`;
  switch (s.prev_relation) {
    case "none":
      return "없음 (첫 재생)";
    case "same_visit":
      return `같은 방문 · ${ended(s.gap_end_to_start_ms)}`;
    case "reentry_same_post":
      return s.gap_exit_to_reenter_ms === null
        ? "나갔다 다시 들어옴"
        : `나갔다 ${durationLabel(s.gap_exit_to_reenter_ms)} 뒤 다시 들어옴`;
    default:
      return `다른 화면 · ${ended(s.gap_end_to_start_ms)}`;
  }
}

function resultNote(j: PlayJudgement, s: TimelineSessionRow): string {
  if (j.status === "excluded") return j.reasons.map((r) => EXCLUDE_REASON_LABEL[r]).join(" / ");
  if (j.status === "check") return j.missing.map((m) => MISSING_INFO_LABEL[m]).join(" / ");
  return s.end_type === null ? "끝 기록 없어도 셈" : "";
}

/** 들은 사람 한 명의 방문별 흐름과 재생별 결과 */
export function listenerTimeline(
  data: TimelineData,
  listenerId: string,
  rules: PlaybackRules,
): { visits: VisitBlock[]; plays: PlayResult[] } {
  const { facts } = factsFromRows(data.sessions);
  const mine = data.sessions
    .map((s, i) => ({ s, fact: facts[i] }))
    .filter((x) => x.s.listener_id === listenerId)
    .sort((a, b) => a.s.started_at.localeCompare(b.s.started_at));

  const playNo = new Map(mine.map((x, i) => [x.s.playback_id, i + 1]));
  const plays: PlayResult[] = mine.map(({ s, fact }, i) => {
    const judgement = judgePlay(fact, rules);
    return {
      no: i + 1,
      playbackId: s.playback_id,
      source: fact.source,
      startedAt: s.started_at,
      prevText: prevText(s),
      judgement,
      note: resultNote(judgement, s),
    };
  });

  const visits: VisitBlock[] = [];
  for (const { s } of mine) {
    if (visits.some((v) => v.visitId === s.visit_id)) continue;
    const events = data.events
      .filter((e) => e.visit_id === s.visit_id && (e.playback_id === null || playNo.has(e.playback_id)))
      .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));

    const items: TimelineItem[] = [];
    const lastIndex = new Map<string, number>();
    for (const e of events) {
      const no = e.playback_id ? playNo.get(e.playback_id) : undefined;
      if (e.event_type === "play_start") {
        const sheet = mine.find((x) => x.s.playback_id === e.playback_id)?.s.source === "song_history_sheet";
        items.push({ at: e.occurred_at, label: `재생 ${no}`, kind: "play", playNo: no, note: sheet ? '"이 곡의 기록" 시트' : undefined });
      } else {
        const label = EVENT_LABEL[e.event_type] ?? e.event_type;
        const seek =
          e.event_type === "seek" && e.seek_from_ms !== null && e.position_ms !== null
            ? `${positionLabel(e.seek_from_ms)} → ${positionLabel(e.position_ms)}`
            : undefined;
        items.push({
          at: e.occurred_at,
          label,
          kind: e.event_type.startsWith("visit_") ? "visit" : "event",
          playNo: no,
          note: seek,
        });
      }
      if (e.playback_id) lastIndex.set(e.playback_id, items.length - 1);
    }

    // 끝 기록(끝까지 들음 · 멈춤)이 없는 재생은 마지막 이벤트 뒤에 표시한다.
    const noEnd = mine
      .filter((x) => x.s.visit_id === s.visit_id && x.s.end_type === null && lastIndex.has(x.s.playback_id))
      .map((x) => ({ at: lastIndex.get(x.s.playback_id)!, no: playNo.get(x.s.playback_id)! }))
      .sort((a, b) => b.at - a.at);
    for (const n of noEnd) {
      items.splice(n.at + 1, 0, { at: null, label: `재생 ${n.no} 끝 기록 없음`, kind: "missing", playNo: n.no });
    }

    visits.push({ visitId: s.visit_id, postId: s.visit_post_id, samePost: s.visit_post_id === s.post_id, items });
  }

  return { visits, plays };
}

import { redirect } from "next/navigation";
import { connection } from "next/server";

import { ROLES, type MissionTester, type TesterRole } from "@/lib/missions";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type MissionData = {
  testers: MissionTester[];
  /** 집계 시작 (한국 날짜 "2026-10-27"), null = 전체 기간 */
  since: string | null;
  /** 불러온 시각 (예: "10.31 14:00") */
  asOf: string;
  isSample: boolean;
};

/** monitor_mission_status() 한 줄 */
type MissionRow = {
  role: string;
  username: string | null;
  account: string | null;
  first_cnt: number;
  comment_cnt: number;
  re_cnt: number;
  re_comment_cnt: number;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** "2026-10-27" 이 실제 날짜면 그대로, 아니면 null */
export function parseSince(value: unknown): string | null {
  if (typeof value !== "string" || !DATE.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value ? value : null;
}

function kstNowLabel(now: Date) {
  const k = new Date(now.getTime() + 9 * 3_600_000).toISOString();
  return `${k.slice(5, 7)}.${k.slice(8, 10)} ${k.slice(11, 16)}`;
}

const isRole = (r: string): r is TesterRole => (ROLES as readonly string[]).includes(r);

function testersFromRows(rows: MissionRow[]): MissionTester[] {
  return rows
    .filter((r) => isRole(r.role))
    .map((r) => ({
      role: r.role as TesterRole,
      nickname: r.username,
      account: r.account ?? "",
      counts: {
        firstUpload: r.first_cnt,
        comment: r.comment_cnt,
        repractice: r.re_cnt,
        repracticeComment: r.re_comment_cnt,
      },
    }));
}

/**
 * 미션 실적을 불러온다. 요청 데이터를 읽으므로 <Suspense> 안에서 부른다.
 * 로그인 안 했으면 /login 으로 보낸다. Supabase 연결 정보가 없으면 예시 데이터.
 */
export async function loadMissions(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<MissionData | { error: "not_admin" | "failed"; message: string }> {
  const since = parseSince((await searchParams).since);

  if (!hasSupabaseEnv()) {
    return { testers: SAMPLE_TESTERS, since, asOf: "10.31 14:00", isSample: true };
  }

  // load-month.tsx 와 같은 이유로 connection() 뒤에서 현재 시각을 읽는다.
  await connection();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) redirect("/login");

  const { data, error } = await supabase.rpc("monitor_mission_status", {
    p_since: since ? `${since}T00:00:00+09:00` : null,
  });
  if (error) {
    return { error: error.code === "42501" ? "not_admin" : "failed", message: error.message };
  }
  return {
    testers: testersFromRows((data ?? []) as MissionRow[]),
    since,
    asOf: kstNowLabel(new Date()),
    isSample: false,
  };
}

// 예시 데이터. Supabase 연결 정보가 없을 때 화면 확인용으로만 쓴다. 실제 사용자가 아니다.
const s = (
  role: TesterRole,
  nickname: string,
  account: string,
  [firstUpload, comment, repractice, repracticeComment]: number[],
): MissionTester => ({ role, nickname, account, counts: { firstUpload, comment, repractice, repracticeComment } });

const SAMPLE_TESTERS: MissionTester[] = [
  s("user", "노을빛", "tester01@gmail.com", [2, 0, 1, 0]),
  s("user", "달토끼", "apple", [2, 0, 1, 0]),
  s("user", "바닷소리", "tester03@gmail.com", [3, 0, 1, 0]),
  s("user", "초록빛", "tester04@gmail.com", [2, 0, 0, 0]),
  s("user", "새벽별", "apple", [1, 0, 0, 0]),
  s("user", "라일락", "tester06@gmail.com", [2, 0, 1, 0]),
  s("user", "파란하늘", "tester07@gmail.com", [0, 0, 0, 0]),
  s("user", "솜사탕", "tester08@gmail.com", [1, 0, 1, 0]),
  s("user", "봄비", "apple", [2, 0, 1, 0]),
  s("user", "은하수", "tester10@gmail.com", [2, 0, 0, 0]),
  s("skilled", "가온", "tester16@gmail.com", [2, 5, 1, 0]),
  s("skilled", "하람", "tester17@gmail.com", [2, 3, 1, 0]),
  s("skilled", "비트박스", "apple", [1, 6, 0, 0]),
  s("skilled", "소리결", "tester19@gmail.com", [2, 0, 0, 0]),
  s("expert", "보컬코치K", "tester21@gmail.com", [0, 7, 0, 3]),
  s("expert", "음악선생", "tester22@gmail.com", [0, 9, 0, 3]),
  s("expert", "피치마스터", "tester23@gmail.com", [0, 5, 0, 1]),
  s("expert", "화음", "apple", [0, 7, 0, 0]),
];

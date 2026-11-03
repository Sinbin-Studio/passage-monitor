import type { Metadata } from "next";

import { hasSupabaseEnv } from "@/lib/supabase/env";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "로그인 · Passage 관리자",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-[380px] flex-col gap-6 rounded-2xl border border-line bg-surface p-7">
        <div className="flex items-center gap-2.5">
          <span className="flex size-[30px] items-center justify-center rounded-lg bg-brand text-[15px] font-extrabold text-white">
            P
          </span>
          <h1 className="text-lg font-extrabold">Passage 관리자</h1>
        </div>
        {hasSupabaseEnv() ? (
          <LoginForm />
        ) : (
          <p className="text-sm text-muted">
            Supabase 연결 정보가 없습니다. <code>.env.local</code> 에 URL 과 anon key 를 넣은 뒤 다시 실행하세요.
          </p>
        )}
      </div>
    </main>
  );
}

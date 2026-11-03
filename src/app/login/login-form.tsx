"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useState } from "react";

import { adminLoginEmail } from "@/lib/admin-login";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  // cacheComponents 에서는 떠난 화면의 상태가 남는다(React <Activity>).
  // 로그인 후 로그아웃하면 이 화면이 "로그인 중…" 상태 그대로 돌아오므로, 화면이 가려질 때 비운다.
  useLayoutEffect(
    () => () => {
      setPending(false);
      setError("");
    },
    [],
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError("");

    const { error } = await createClient().auth.signInWithPassword({
      email: adminLoginEmail(String(form.get("loginId"))),
      password: String(form.get("password")),
    });

    if (error) {
      setPending(false);
      setError(
        error.code === "invalid_credentials"
          ? "아이디 또는 비밀번호가 맞지 않습니다."
          : "로그인하지 못했습니다. 잠시 뒤 다시 시도하세요.",
      );
      return;
    }
    router.replace("/playback");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      // 화면이 가려질 때 아이디 · 비밀번호 칸도 비운다 (로그아웃 뒤 이전 비밀번호가 남지 않게).
      ref={(form) => () => form?.reset()}
      className="flex flex-col gap-4"
    >
      <label className="flex flex-col gap-1.5 text-sm font-extrabold">
        아이디
        <input
          name="loginId"
          type="text"
          autoCapitalize="none"
          spellCheck={false}
          required
          autoComplete="username"
          className="min-h-11 rounded-[10px] border border-line px-3 text-[15px] font-normal outline-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-extrabold">
        비밀번호
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="min-h-11 rounded-[10px] border border-line px-3 text-[15px] font-normal outline-brand"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-status-check-fg">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-[10px] bg-brand text-sm font-extrabold text-white hover:bg-brand-deep disabled:opacity-60"
      >
        {pending ? "로그인 중…" : "로그인"}
      </button>
    </form>
  );
}

"use client";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="ml-auto min-h-10 rounded-lg border border-line px-3 text-[13px] text-muted hover:text-foreground"
    >
      로그아웃
    </button>
  );
}

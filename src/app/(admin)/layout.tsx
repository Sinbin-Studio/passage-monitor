import { Suspense } from "react";

import { hasSupabaseEnv } from "@/lib/supabase/env";

import { AdminNav, AdminNavFallback, SubNav, SubNavFallback } from "./admin-nav";
import { LogoutButton } from "./logout-button";
import { RulesProvider } from "./rules-context";

export default function AdminLayout({ children }: LayoutProps<"/">) {
  return (
    <RulesProvider>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-7 gap-y-2 px-8 py-2 max-sm:px-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-[30px] items-center justify-center rounded-lg bg-brand text-[15px] font-extrabold text-white">
              P
            </span>
            <span className="text-base font-extrabold">Passage 관리자</span>
          </div>
          <Suspense fallback={<AdminNavFallback />}>
            <AdminNav />
          </Suspense>
          {hasSupabaseEnv() && <LogoutButton />}
        </div>
      </header>
      <Suspense fallback={<SubNavFallback />}>
        <SubNav />
      </Suspense>
      <main className="mx-auto flex w-full max-w-[1320px] flex-col px-8 pt-7 pb-16 max-sm:px-4">{children}</main>
    </RulesProvider>
  );
}

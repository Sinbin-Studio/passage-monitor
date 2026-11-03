import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseEnv } from "./env";

// 요청마다 새 클라이언트를 만든다 (쿠키·캐시 헤더가 요청 단위로 묶여 있음).
export async function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Component 에서는 쿠키를 쓸 수 없다. 세션 갱신은 proxy 가 담당한다.
        }
      },
    },
  });
}

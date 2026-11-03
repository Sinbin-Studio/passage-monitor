import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 매 요청마다 Supabase Auth 세션을 갱신해 쿠키에 다시 쓴다.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // 환경 변수가 없으면 (예: 첫 로컬 실행) 세션 갱신 없이 통과시킨다.
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();

  // 이미 로그인했으면 로그인 화면 대신 재생 현황으로 보낸다 (로그아웃된 것처럼 보이지 않게).
  if (data?.claims && request.nextUrl.pathname === "/login") {
    const to = request.nextUrl.clone();
    to.pathname = "/playback";
    to.search = "";
    const redirect = NextResponse.redirect(to);
    // 위에서 갱신한 세션 쿠키를 그대로 넘긴다.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

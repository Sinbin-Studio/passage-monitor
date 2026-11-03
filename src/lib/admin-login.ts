// 관리자는 아이디로 로그인한다. Supabase Auth 는 이메일 형식만 받으므로
// 아이디 뒤에 고정 도메인을 붙인 주소를 계정 이메일로 쓴다 (실제 메일함 아님, D-005).

const DEFAULT_DOMAIN = "passage.invalid";

/** "admin1" → "admin1@<도메인>". "@" 가 들어 있으면 그대로 쓴다. */
export function adminLoginEmail(loginId: string, domain: string = process.env.NEXT_PUBLIC_ADMIN_ID_DOMAIN || DEFAULT_DOMAIN): string {
  const id = loginId.trim().toLowerCase();
  return id.includes("@") ? id : `${id}@${domain}`;
}

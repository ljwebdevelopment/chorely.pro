// Single hardcoded admin account. Intentionally simple — expand to a real
// role system only if a second admin is ever needed.
export const ADMIN_EMAIL = "lljohnson1201@gmail.com";

export function isAdminEmail(email?: string | null) {
  return (email || "").trim().toLowerCase() === ADMIN_EMAIL;
}

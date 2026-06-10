export function safeRedirectPath(value: string | null | undefined, fallback = "/dashboard") {
  const candidate = String(value || "").trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback;
  if (candidate.includes("\\") || candidate.toLowerCase().startsWith("/http")) return fallback;

  try {
    const parsed = new URL(candidate, "https://chorely.pro");
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

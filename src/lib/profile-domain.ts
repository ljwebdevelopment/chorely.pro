// Pure profile-session logic, safe to import from middleware (edge runtime)
// and from tests. Cookie reading/writing lives in profile-session.ts.

export const ACTIVE_PROFILE_COOKIE = "chorely-active-profile";

export type ActiveProfile = { type: "parent" } | { type: "child"; childId: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseActiveProfile(value: string | null | undefined): ActiveProfile | null {
  if (!value) return null;
  if (value === "parent") return { type: "parent" };
  if (value.startsWith("child:")) {
    const childId = value.slice("child:".length);
    return uuidPattern.test(childId) ? { type: "child", childId } : null;
  }
  return null;
}

export function serializeActiveProfile(profile: ActiveProfile) {
  return profile.type === "parent" ? "parent" : `child:${profile.childId}`;
}

// Pages a child profile must never see. /account/billing is exempt so the
// subscription-required redirect can never loop while a child profile is
// active; everything else under /account stays parent-only.
const parentOnlyPrefixes = [
  "/dashboard",
  "/children",
  "/chores",
  "/approvals",
  "/earnings",
  "/reports",
  "/notifications",
  "/account"
];

function isParentOnlyPath(pathname: string) {
  if (pathname.startsWith("/account/billing")) return false;
  return parentOnlyPrefixes.some((prefix) => pathname.startsWith(prefix));
}

// Pages that require some profile to be selected first. /onboarding and
// /account are intentionally absent: onboarding runs before profiles exist,
// and billing must stay reachable for the subscription-required redirect.
const profileGatedPrefixes = [
  "/dashboard",
  "/children",
  "/chores",
  "/approvals",
  "/earnings",
  "/reports",
  "/notifications",
  "/child"
];

export function profileRedirectPath(input: { pathname: string; cookieValue: string | null | undefined }) {
  const profile = parseActiveProfile(input.cookieValue);

  if (!profile && profileGatedPrefixes.some((prefix) => input.pathname.startsWith(prefix))) {
    return "/profiles";
  }

  if (profile?.type === "child" && isParentOnlyPath(input.pathname)) {
    return "/child";
  }

  return null;
}

export function profileInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0][0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] || "" : "";
  return (first + last).toUpperCase() || "?";
}

export function parentPinError(pin: string) {
  if (!/^[0-9]{4,8}$/.test(pin)) return "Parent PIN must be 4 to 8 digits.";
  return null;
}

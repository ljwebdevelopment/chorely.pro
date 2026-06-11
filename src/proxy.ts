import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { ACTIVE_PROFILE_COOKIE, profileRedirectPath } from "@/lib/profile-domain";

const protectedPrefixes = [
  "/dashboard",
  "/children",
  "/chores",
  "/approvals",
  "/earnings",
  "/reports",
  "/notifications",
  "/account",
  "/onboarding",
  "/child",
  "/profiles",
  "/api/stripe/checkout",
  "/api/stripe/portal"
];

function signInNextPath(pathname: string) {
  return pathname.startsWith("/api/stripe/") ? "/account/billing" : pathname;
}

export async function proxy(request: NextRequest) {
  const currentPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-chorely-current-path", currentPath);
  const { response, user } = await updateSession(request, requestHeaders);
  const isProtected = protectedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix));

  if (!isProtected) {
    return response;
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", signInNextPath(currentPath));
    url.searchParams.set("error", "Supabase is not configured for this deployment.");
    return NextResponse.redirect(url);
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", signInNextPath(currentPath));
    return NextResponse.redirect(url);
  }

  // Profile switcher gates: signed-in family members must pick a profile
  // before app pages, and child profiles only ever see the kids' view.
  const profileRedirect = profileRedirectPath({
    pathname: request.nextUrl.pathname,
    cookieValue: request.cookies.get(ACTIVE_PROFILE_COOKIE)?.value
  });
  if (profileRedirect) {
    const url = request.nextUrl.clone();
    url.pathname = profileRedirect;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg|app-icon.svg|manifest.webmanifest|sw.js).*)"]
};

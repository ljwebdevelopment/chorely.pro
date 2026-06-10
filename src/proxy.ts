import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

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

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg|app-icon.svg|manifest.webmanifest|sw.js).*)"]
};

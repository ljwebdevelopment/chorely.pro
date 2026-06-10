import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeRedirectPath } from "@/lib/redirect-domain";
import { authCallbackErrorMessage } from "@/lib/auth-callback-domain";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeRedirectPath(url.searchParams.get("next"), "/dashboard");
  const providerError = url.searchParams.get("error");
  const providerErrorDescription = url.searchParams.get("error_description");

  const callbackError = authCallbackErrorMessage({ code, providerError, providerErrorDescription });
  if (callbackError) {
    const signInUrl = new URL("/sign-in", url.origin);
    signInUrl.searchParams.set("next", next);
    signInUrl.searchParams.set("error", callbackError);
    return NextResponse.redirect(signInUrl);
  }

  if (!code) {
    const signInUrl = new URL("/sign-in", url.origin);
    signInUrl.searchParams.set("next", next);
    signInUrl.searchParams.set("error", "Missing auth callback code. Please sign in again.");
    return NextResponse.redirect(signInUrl);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  const exchangeError = authCallbackErrorMessage({ code, exchangeError: error?.message });
  if (exchangeError) {
    const signInUrl = new URL("/sign-in", url.origin);
    signInUrl.searchParams.set("next", next);
    signInUrl.searchParams.set("error", exchangeError);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

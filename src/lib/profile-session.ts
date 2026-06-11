import { cookies } from "next/headers";
import { ACTIVE_PROFILE_COOKIE, parseActiveProfile, serializeActiveProfile, type ActiveProfile } from "@/lib/profile-domain";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30
};

export async function getActiveProfile(): Promise<ActiveProfile | null> {
  const store = await cookies();
  return parseActiveProfile(store.get(ACTIVE_PROFILE_COOKIE)?.value);
}

export async function setActiveProfile(profile: ActiveProfile) {
  const store = await cookies();
  store.set(ACTIVE_PROFILE_COOKIE, serializeActiveProfile(profile), cookieOptions);
}

export async function clearActiveProfile() {
  const store = await cookies();
  store.delete(ACTIVE_PROFILE_COOKIE);
}

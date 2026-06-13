// Volunteer testing flow. Set TEST_MODE=true to let approved volunteer
// testers verify their email + phone against the volunteer_testers table,
// then create their own Supabase Auth account through the normal sign-up
// flow. To remove entirely: delete this file, the verifyVolunteerAction and
// claimVolunteerAction exports in actions.ts, src/lib/volunteer-domain.ts,
// the volunteer-verify/volunteer-claim pages, and the TEST_MODE-gated links
// and banner code in sign-in/sign-up/app-shell/auth-context/account pages.

export const TEST_MODE = process.env.TEST_MODE === "true";

export const VOLUNTEER_VERIFY_COOKIE = "chorely-volunteer-verify";

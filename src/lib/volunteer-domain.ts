export function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export function volunteerVerificationError(input: { email: string; phone: string }) {
  if (!input.email.trim()) return "Enter the email address you used to sign up for testing.";
  if (!normalizePhone(input.phone)) return "Enter the phone number you used to sign up for testing.";
  return null;
}

export function volunteerNotFoundMessage() {
  return "We couldn't match that email and phone number to an approved tester invite.";
}

export function volunteerAlreadyClaimedMessage() {
  return "This tester invite has already been used. Sign in with your existing account instead.";
}

export function volunteerVerificationExpiredMessage() {
  return "Your verification expired. Please verify your email and phone again.";
}

export const FOUNDING_TESTER_BADGE_LABEL = "Founding Tester";

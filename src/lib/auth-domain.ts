export function passwordConfirmationError(input: { password: string; confirmation: string }) {
  if (input.password.length < 8) return "Password must be at least 8 characters.";
  if (input.password !== input.confirmation) return "Password confirmation does not match.";
  return null;
}

export function authProviderFailureMessage(input: {
  action: "sign-up" | "sign-in" | "password-reset" | "password-update";
}) {
  if (input.action === "sign-up") return "Unable to create your account right now. Please try again.";
  if (input.action === "sign-in") return "Unable to sign in with those credentials.";
  if (input.action === "password-reset") return "Unable to send a password reset email right now. Please try again.";
  return "Unable to update your password right now. Please try again.";
}

export function deleteAccountConfirmationError(value: string) {
  return value.trim().toUpperCase() === "DELETE" ? null : "Type DELETE to confirm account deletion.";
}

export function profileWriteFailureMessage(input: { wroteRow?: boolean }) {
  if (!input.wroteRow) {
    return "Your profile could not be found. Please refresh and try again.";
  }

  return "Unable to save profile right now.";
}

export function householdWriteFailureMessage(input: { wroteRow?: boolean }) {
  if (!input.wroteRow) {
    return "Your household could not be found. Please finish onboarding or refresh and try again.";
  }

  return "Unable to save household settings right now.";
}

const maxProfileNameLength = 100;
const maxHouseholdNameLength = 80;

export function profileNameError(value: string) {
  return value.trim().length > maxProfileNameLength ? `Full name must be ${maxProfileNameLength} characters or fewer.` : null;
}

export function householdNameError(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "Household name is required.";
  if (trimmed.length > maxHouseholdNameLength) return `Household name must be ${maxHouseholdNameLength} characters or fewer.`;
  return null;
}

export function deleteAccountFailureMessage() {
  return "Unable to delete your account right now. Please try again or contact support.";
}

export function deleteAccountConfigurationFailureMessage() {
  return "Account deletion is not configured for this deployment yet. Please contact support.";
}

export function shouldCancelSubscriptionBeforeAccountDeletion(input: {
  stripeSubscriptionId?: string | null;
  status?: string | null;
}) {
  if (!input.stripeSubscriptionId) return false;
  return !["canceled", "incomplete_expired", "none"].includes(input.status || "none");
}

export function deleteAccountSubscriptionFailureMessage(input: { target: "configuration" | "stripe" }) {
  return input.target === "configuration"
    ? "Billing is not configured, so your subscription could not be canceled before account deletion."
    : "Your Stripe subscription could not be canceled. Please try again or use billing settings before deleting your account.";
}

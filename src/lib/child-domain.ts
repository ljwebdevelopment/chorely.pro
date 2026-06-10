export function childPinIsValid(pin: string) {
  return /^\d{4,8}$/.test(pin);
}

export function childPinRequirementError(input: { isNewChild: boolean; pin: string }) {
  if (!input.isNewChild && input.pin === "") return null;
  if (!childPinIsValid(input.pin)) return "Child PIN must be 4 to 8 digits.";
  return null;
}

const maxChildNameLength = 80;
const maxChildAvatarUrlLength = 500;

export function childNameError(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "Child name is required.";
  if (trimmed.length > maxChildNameLength) return `Child name must be ${maxChildNameLength} characters or fewer.`;
  return null;
}

export function childAvatarUrlError(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxChildAvatarUrlLength) return `Avatar URL must be ${maxChildAvatarUrlLength} characters or fewer.`;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? null : "Avatar URL must be a valid http or https URL.";
  } catch {
    return "Avatar URL must be a valid http or https URL.";
  }
}

export function childArchiveFailureMessage(input: { target: "child" | "assignments" | "completions"; wroteRow?: boolean }) {
  if (input.target === "child" && !input.wroteRow) {
    return "This child profile could not be found. Please refresh and try again.";
  }

  if (input.target === "completions") {
    return "Child was archived, but pending chore completions could not be cleared.";
  }

  return input.target === "assignments"
    ? "Child was archived, but chore assignments could not be cleared."
    : "Unable to archive child right now.";
}

export function childSaveFailureMessage(input: { target: "child" | "pin" | "onboarding"; wroteRow?: boolean }) {
  if (input.target === "child" && !input.wroteRow) {
    return "Child profile could not be saved. Please refresh and try again.";
  }

  if (input.target === "pin") {
    return "Child profile was saved, but the PIN could not be saved.";
  }

  return input.target === "onboarding"
    ? "Child profile was saved, but onboarding progress could not be updated."
    : "Unable to save child right now.";
}

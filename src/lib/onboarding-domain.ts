export function isOnboardingSource(source: FormDataEntryValue | null) {
  return String(source || "") === "onboarding";
}

export function appContextOptionsForSetupAction(source: FormDataEntryValue | null) {
  return isOnboardingSource(source) ? {} : { requireSubscription: true };
}

export function setupActionErrorPath(input: {
  source: FormDataEntryValue | null;
  fallbackPath: string;
  message: string;
  step?: string;
}) {
  const isOnboarding = isOnboardingSource(input.source);
  const params = new URLSearchParams();

  if (isOnboarding && input.step) {
    params.set("step", input.step);
  }

  params.set("error", input.message);
  return `${isOnboarding ? "/onboarding" : input.fallbackPath}?${params.toString()}`;
}

export type OnboardingStateChecklist = {
  household_created?: boolean | null;
  children_added?: boolean | null;
  rewards_set?: boolean | null;
  first_chore_created?: boolean | null;
  example_approved?: boolean | null;
  earnings_reviewed?: boolean | null;
};

const requiredSteps: Array<keyof OnboardingStateChecklist> = [
  "household_created",
  "children_added",
  "rewards_set",
  "first_chore_created",
  "example_approved",
  "earnings_reviewed"
];

const labels: Record<keyof OnboardingStateChecklist, string> = {
  household_created: "Create Household",
  children_added: "Add Children",
  rewards_set: "Set Chore Rewards",
  first_chore_created: "Create First Chore",
  example_approved: "Approve Example Completion",
  earnings_reviewed: "Review Earnings Dashboard"
};

export function missingOnboardingSteps(state: OnboardingStateChecklist | null | undefined) {
  return requiredSteps.filter((step) => !state?.[step]).map((step) => labels[step]);
}

export function nextOnboardingActions(state: OnboardingStateChecklist | null | undefined) {
  if (!state?.household_created) return [labels.household_created];
  if (!state.children_added || !state.rewards_set) return ["Add Children and Set Chore Rewards"];
  if (!state.first_chore_created) return [labels.first_chore_created];
  if (!state.example_approved) return [labels.example_approved];
  if (!state.earnings_reviewed) return [labels.earnings_reviewed];
  return [];
}

export function onboardingReadyToComplete(state: OnboardingStateChecklist | null | undefined) {
  return missingOnboardingSteps(state).length === 0;
}

export function missingOnboardingData(input: {
  hasHousehold: boolean;
  activeChildrenCount: number;
  activeChoresCount: number;
  approvedExampleCount: number;
}) {
  const missing: string[] = [];
  if (!input.hasHousehold) missing.push("Create Household");
  if (input.activeChildrenCount < 1) missing.push("Add Children");
  if (input.activeChoresCount < 1) missing.push("Create First Chore");
  if (input.approvedExampleCount < 1) missing.push("Approve Example Completion");
  return missing;
}

export function onboardingCompletionWriteFailureMessage(input: { target: "state" | "profile"; wroteRow?: boolean }) {
  if (!input.wroteRow) {
    return input.target === "state"
      ? "Onboarding state could not be updated. Please refresh and try again."
      : "Your profile could not be marked as onboarded. Please refresh and try again.";
  }

  return "Unable to complete onboarding right now.";
}

export function householdSetupFailureMessage(input: { target: "household" | "member" | "state"; wroteRow?: boolean }) {
  if (!input.wroteRow) {
    if (input.target === "household") return "Household could not be created. Please refresh and try again.";
    if (input.target === "member") return "Household was created, but your parent access could not be saved.";
    return "Household was created, but onboarding could not be updated.";
  }

  return "Unable to create household right now.";
}

export function householdAlreadyExistsMessage() {
  return "Your household already exists. Continue setup from the next step.";
}

export function exampleCompletionFailureMessage(input: { target: "completion" | "notification"; wroteRow?: boolean }) {
  if (!input.wroteRow) {
    return input.target === "completion"
      ? "Example completion could not be created. Please refresh and try again."
      : "Example completion was created, but the approval notification could not be saved.";
  }

  return input.target === "completion" ? "Unable to submit the example completion right now." : "Unable to save the approval notification.";
}

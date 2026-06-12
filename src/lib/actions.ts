"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/auth-context";
import { getSiteUrl } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { rewardCentsFromInput } from "@/lib/money";
import { hashPin, verifyPin } from "@/lib/security";
import { createNotification } from "@/lib/notifications";
import { choreMilestones, milestoneNotificationPayloads, notificationWriteFailureMessage } from "@/lib/notification-domain";
import { normalizeBuddyStyle, reminderBody } from "@/lib/buddy-domain";
import { parentPinError } from "@/lib/profile-domain";
import { clearActiveProfile, setActiveProfile } from "@/lib/profile-session";
import {
  activeAssignedChildIds,
  canAddCompletionProgress,
  choreCustomScheduleError,
  choreDescriptionError,
  completionNoteError,
  choreSaveFailureMessage,
  choreTitleError,
  completionProgressContributionError,
  completionSideEffectFailureMessage,
  completionSubmissionError,
  completionWriteFailureMessage,
  completionRedirectState,
  isChoreDueOn,
  nextCompletionState,
  shouldSplitCompletionReward,
  splitRewardCents,
  validateAssignedParticipants,
  validateChoreAssignmentIds,
  validateChoreScheduleFrequency,
  validateSharedCompletionMode
} from "@/lib/chore-domain";
import {
  choreCommentTextError,
  normalizeChoreCommentAlert,
  normalizeChoreCommentKind,
  choreCommentKindLabel
} from "@/lib/chore-comment-domain";
import {
  appContextOptionsForSetupAction,
  exampleCompletionFailureMessage,
  householdAlreadyExistsMessage,
  householdSetupFailureMessage,
  isOnboardingSource,
  missingOnboardingData,
  missingOnboardingSteps,
  onboardingCompletionWriteFailureMessage,
  setupActionErrorPath
} from "@/lib/onboarding-domain";
import { safeRedirectPath } from "@/lib/redirect-domain";
import { TEST_MODE, VOLUNTEER_VERIFY_COOKIE } from "@/lib/test-mode";
import {
  normalizePhone,
  volunteerAlreadyClaimedMessage,
  volunteerNotFoundMessage,
  volunteerVerificationError,
  volunteerVerificationExpiredMessage
} from "@/lib/volunteer-domain";
import { approvalNoteError, approvalSideEffectFailureMessage, canReviewCompletion, isReviewAction, reviewWriteFailureMessage } from "@/lib/approval-domain";
import { childArchiveFailureMessage, childAvatarUrlError, childNameError, childPinRequirementError, childSaveFailureMessage } from "@/lib/child-domain";
import {
  authProviderFailureMessage,
  deleteAccountConfirmationError,
  deleteAccountConfigurationFailureMessage,
  deleteAccountFailureMessage,
  deleteAccountSubscriptionFailureMessage,
  householdNameError,
  householdWriteFailureMessage,
  passwordConfirmationError,
  profileNameError,
  profileWriteFailureMessage,
  shouldCancelSubscriptionBeforeAccountDeletion
} from "@/lib/auth-domain";

function formString(formData: FormData, name: string, fallback = "") {
  return String(formData.get(name) || fallback).trim();
}

function checked(formData: FormData, name: string) {
  return formData.get(name) === "on" || formData.get(name) === "true";
}

async function upsertOnboardingProgress(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  progress: Partial<{
    household_created: boolean;
    children_added: boolean;
    rewards_set: boolean;
    first_chore_created: boolean;
    example_approved: boolean;
    earnings_reviewed: boolean;
    pwa_reviewed: boolean;
  }>
) {
  return supabase
    .from("onboarding_state")
    .upsert({ user_id: userId, ...progress, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    .select("user_id")
    .maybeSingle();
}

export async function signUpAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const origin = (await headers()).get("origin") || getSiteUrl();
  const email = formString(formData, "email").toLowerCase();
  const password = formString(formData, "password");
  const passwordConfirmation = formString(formData, "password_confirmation");
  const fullName = formString(formData, "full_name");
  const next = safeRedirectPath(formString(formData, "next", "/dashboard"));
  const passwordError = passwordConfirmationError({ password, confirmation: passwordConfirmation });
  if (passwordError) redirect(`/sign-up?next=${encodeURIComponent(next)}&error=${encodeURIComponent(passwordError)}`);
  const profileError = profileNameError(fullName);
  if (profileError) redirect(`/sign-up?next=${encodeURIComponent(next)}&error=${encodeURIComponent(profileError)}`);

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
      data: { full_name: fullName }
    }
  });

  if (error) redirect(`/sign-up?next=${encodeURIComponent(next)}&error=${encodeURIComponent(authProviderFailureMessage({ action: "sign-up" }))}`);
  redirect("/verify-email");
}

export async function signInAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const email = formString(formData, "email").toLowerCase();
  const password = formString(formData, "password");
  const next = safeRedirectPath(formString(formData, "next", "/dashboard"));
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/sign-in?next=${encodeURIComponent(next)}&error=${encodeURIComponent(authProviderFailureMessage({ action: "sign-in" }))}`);
  redirect(next);
}

export async function verifyVolunteerAction(formData: FormData) {
  if (!TEST_MODE) redirect("/sign-in");

  const email = formString(formData, "email").toLowerCase();
  const phone = formString(formData, "phone");
  const validationError = volunteerVerificationError({ email, phone });
  if (validationError) {
    redirect(`/volunteer-verify?error=${encodeURIComponent(validationError)}`);
  }

  const normalizedPhone = normalizePhone(phone);
  const admin = createSupabaseAdminClient();
  const { data: volunteer, error } = await admin
    .from("volunteer_testers")
    .select("id,auth_user_id")
    .eq("normalized_phone", normalizedPhone)
    .ilike("email", email)
    .maybeSingle();
  if (error || !volunteer) {
    redirect(`/volunteer-verify?error=${encodeURIComponent(volunteerNotFoundMessage())}`);
  }
  if (volunteer.auth_user_id) {
    redirect(`/volunteer-verify?error=${encodeURIComponent(volunteerAlreadyClaimedMessage())}`);
  }

  const store = await cookies();
  store.set(VOLUNTEER_VERIFY_COOKIE, volunteer.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 30
  });

  redirect("/volunteer-claim");
}

export async function claimVolunteerAction(formData: FormData) {
  if (!TEST_MODE) redirect("/sign-in");

  const store = await cookies();
  const volunteerId = store.get(VOLUNTEER_VERIFY_COOKIE)?.value;
  if (!volunteerId) {
    redirect(`/volunteer-verify?error=${encodeURIComponent(volunteerVerificationExpiredMessage())}`);
  }

  const admin = createSupabaseAdminClient();
  const { data: volunteer, error: lookupError } = await admin
    .from("volunteer_testers")
    .select("id,name,email,auth_user_id")
    .eq("id", volunteerId)
    .maybeSingle();
  if (lookupError || !volunteer) {
    redirect(`/volunteer-verify?error=${encodeURIComponent(volunteerVerificationExpiredMessage())}`);
  }
  if (volunteer.auth_user_id) {
    redirect(`/volunteer-verify?error=${encodeURIComponent(volunteerAlreadyClaimedMessage())}`);
  }

  const password = formString(formData, "password");
  const passwordConfirmation = formString(formData, "password_confirmation");
  const passwordError = passwordConfirmationError({ password, confirmation: passwordConfirmation });
  if (passwordError) {
    redirect(`/volunteer-claim?error=${encodeURIComponent(passwordError)}`);
  }

  const supabase = await createSupabaseServerClient();
  const origin = (await headers()).get("origin") || getSiteUrl();
  const { data, error } = await supabase.auth.signUp({
    email: volunteer.email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
      data: { full_name: volunteer.name }
    }
  });
  if (error || !data.user) {
    redirect(`/volunteer-claim?error=${encodeURIComponent(authProviderFailureMessage({ action: "sign-up" }))}`);
  }

  await admin
    .from("volunteer_testers")
    .update({ auth_user_id: data.user.id, claimed_at: new Date().toISOString() })
    .eq("id", volunteer.id);

  store.delete(VOLUNTEER_VERIFY_COOKIE);
  redirect("/verify-email");
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  await clearActiveProfile();
  redirect("/");
}

export async function selectProfileAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const context = await getAppContext({ requireSubscription: true, requireOnboarding: true });
  if (!context.household) redirect("/onboarding");

  const choice = formString(formData, "profile");

  if (choice === "parent") {
    // parent_pin_hash ships in migration 005; tolerate its absence so the
    // profile screen keeps working on a database that has not run it yet.
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("parent_pin_hash")
      .eq("id", context.user.id)
      .maybeSingle();
    if (profileRow?.parent_pin_hash) {
      const pin = formString(formData, "pin");
      if (!pin || !verifyPin(pin, profileRow.parent_pin_hash)) {
        redirect(`/profiles?error=${encodeURIComponent("That parent PIN is not right. Try again.")}`);
      }
    }
    await setActiveProfile({ type: "parent" });
    redirect("/dashboard");
  }

  const { data: child, error: childError } = await supabase
    .from("children")
    .select("id")
    .eq("id", choice)
    .eq("household_id", context.household.id)
    .is("archived_at", null)
    .maybeSingle();
  if (childError || !child) {
    redirect(`/profiles?error=${encodeURIComponent("That profile could not be found.")}`);
  }

  await setActiveProfile({ type: "child", childId: child.id });
  redirect("/child");
}

export async function switchProfileAction() {
  await clearActiveProfile();
  redirect("/profiles");
}

export async function saveParentPinAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const context = await getAppContext({ requireSubscription: true });

  if (formString(formData, "action") === "remove") {
    const { error } = await supabase
      .from("profiles")
      .update({ parent_pin_hash: null, updated_at: new Date().toISOString() })
      .eq("id", context.user.id);
    if (error) {
      redirect(`/account/security?error=${encodeURIComponent("The parent PIN could not be removed right now.")}`);
    }
    revalidatePath("/account/security");
    redirect("/account/security?updated=pin-removed");
  }

  const pin = formString(formData, "parent_pin");
  const pinError = parentPinError(pin);
  if (pinError) {
    redirect(`/account/security?error=${encodeURIComponent(pinError)}`);
  }

  const { error } = await supabase
    .from("profiles")
    .update({ parent_pin_hash: hashPin(pin), updated_at: new Date().toISOString() })
    .eq("id", context.user.id);
  if (error) {
    redirect(
      `/account/security?error=${encodeURIComponent(
        "The parent PIN could not be saved. If this keeps happening, the parent PIN database migration may still need to run."
      )}`
    );
  }

  revalidatePath("/account/security");
  redirect("/account/security?updated=pin");
}

export async function forgotPasswordAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const origin = (await headers()).get("origin") || getSiteUrl();
  const email = formString(formData, "email").toLowerCase();
  const next = safeRedirectPath(formString(formData, "next", "/account/security"), "/account/security");
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`
  });
  if (error) {
    redirect(`/forgot-password?next=${encodeURIComponent(next)}&error=${encodeURIComponent(authProviderFailureMessage({ action: "password-reset" }))}`);
  }
  redirect(`/forgot-password?next=${encodeURIComponent(next)}&sent=1`);
}

export async function updatePasswordAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const password = formString(formData, "password");
  const passwordConfirmation = formString(formData, "password_confirmation");
  const passwordError = passwordConfirmationError({ password, confirmation: passwordConfirmation });
  if (passwordError) redirect(`/account/security?error=${encodeURIComponent(passwordError)}`);
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/account/security?error=${encodeURIComponent(authProviderFailureMessage({ action: "password-update" }))}`);
  redirect("/account/security?updated=1");
}

export async function updateProfileAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const context = await getAppContext();
  const fullName = formString(formData, "full_name");
  const nameError = profileNameError(fullName);
  if (nameError) redirect(`/account?error=${encodeURIComponent(nameError)}`);

  const { data: profile, error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, updated_at: new Date().toISOString() })
    .eq("id", context.user.id)
    .select("id")
    .maybeSingle();
  if (error || !profile) {
    redirect(`/account?error=${encodeURIComponent(profileWriteFailureMessage({ wroteRow: Boolean(profile) }))}`);
  }
  revalidatePath("/account");
  redirect("/account?updated=profile");
}

export async function updateHouseholdAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const context = await getAppContext();
  if (!context.household) {
    redirect(`/account?error=${encodeURIComponent(householdWriteFailureMessage({ wroteRow: false }))}`);
  }
  const name = formString(formData, "household_name");
  const nameError = householdNameError(name);
  if (nameError) redirect(`/account?error=${encodeURIComponent(nameError)}`);

  const { data: household, error } = await supabase
    .from("households")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", context.household.id)
    .eq("owner_id", context.user.id)
    .select("id")
    .maybeSingle();
  if (error || !household) {
    redirect(`/account?error=${encodeURIComponent(householdWriteFailureMessage({ wroteRow: Boolean(household) }))}`);
  }

  revalidatePath("/account");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
  redirect("/account?updated=household");
}

export async function deleteAccountAction(formData: FormData) {
  const context = await getAppContext();
  const confirmationError = deleteAccountConfirmationError(formString(formData, "confirmation"));
  if (confirmationError) redirect(`/account?error=${encodeURIComponent(confirmationError)}`);
  if (
    shouldCancelSubscriptionBeforeAccountDeletion({
      stripeSubscriptionId: context.subscription?.stripe_subscription_id,
      status: context.subscription?.status
    })
  ) {
    if (!process.env.STRIPE_SECRET_KEY) {
      redirect(`/account?error=${encodeURIComponent(deleteAccountSubscriptionFailureMessage({ target: "configuration" }))}`);
    }

    try {
      await getStripe().subscriptions.cancel(context.subscription!.stripe_subscription_id!);
    } catch {
      redirect(`/account?error=${encodeURIComponent(deleteAccountSubscriptionFailureMessage({ target: "stripe" }))}`);
    }
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    redirect(`/account?error=${encodeURIComponent(deleteAccountConfigurationFailureMessage())}`);
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(context.user.id);
  if (error) {
    redirect(`/account?error=${encodeURIComponent(deleteAccountFailureMessage())}`);
  }
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function createHouseholdAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const context = await getAppContext();
  if (context.household) {
    redirect(`/onboarding?step=children&error=${encodeURIComponent(householdAlreadyExistsMessage())}`);
  }

  const name = formString(formData, "name", "My Household");
  const nameError = householdNameError(name);
  if (nameError) redirect(`/onboarding?error=${encodeURIComponent(nameError)}`);

  const { data: household, error } = await supabase
    .from("households")
    .insert({ name, owner_id: context.user.id })
    .select("id")
    .single();
  if (error || !household) {
    redirect(
      `/onboarding?error=${encodeURIComponent(
        householdSetupFailureMessage({ target: "household", wroteRow: Boolean(household) })
      )}`
    );
  }

  const { data: member, error: memberError } = await supabase
    .from("household_members")
    .insert({ household_id: household.id, user_id: context.user.id, role: "parent" })
    .select("id")
    .single();
  if (memberError || !member) {
    redirect(
      `/onboarding?error=${encodeURIComponent(householdSetupFailureMessage({ target: "member", wroteRow: Boolean(member) }))}`
    );
  }

  const { data: state, error: stateError } = await upsertOnboardingProgress(supabase, context.user.id, { household_created: true });
  if (stateError || !state) {
    redirect(
      `/onboarding?error=${encodeURIComponent(householdSetupFailureMessage({ target: "state", wroteRow: Boolean(state) }))}`
    );
  }
  revalidatePath("/onboarding");
  redirect("/onboarding?step=children");
}

export async function saveChildAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const context = await getAppContext(appContextOptionsForSetupAction(formData.get("source")));
  const source = formData.get("source");
  if (!context.household) redirect("/onboarding");

  const id = formString(formData, "id");
  const pin = formString(formData, "pin");
  const name = formString(formData, "name");
  const avatarUrl = formString(formData, "avatar_url");
  const nameError = childNameError(name);
  if (nameError) {
    redirect(setupActionErrorPath({ source, fallbackPath: "/children", step: "children", message: nameError }));
  }
  const avatarError = childAvatarUrlError(avatarUrl);
  if (avatarError) {
    redirect(setupActionErrorPath({ source, fallbackPath: "/children", step: "children", message: avatarError }));
  }
  const pinError = childPinRequirementError({ isNewChild: !id, pin });
  if (pinError) {
    redirect(setupActionErrorPath({ source, fallbackPath: "/children", step: "children", message: pinError }));
  }

  const payload = {
    household_id: context.household.id,
    name,
    avatar_url: avatarUrl || null,
    updated_at: new Date().toISOString()
  };

  const { data: child, error } = id
    ? await supabase
        .from("children")
        .update(payload)
        .eq("id", id)
        .eq("household_id", context.household.id)
        .is("archived_at", null)
        .select("id")
        .maybeSingle()
    : await supabase.from("children").insert(payload).select("id").single();

  if (error || !child) {
    redirect(
      setupActionErrorPath({
        source,
        fallbackPath: "/children",
        step: "children",
        message: childSaveFailureMessage({ target: "child", wroteRow: Boolean(child) })
      })
    );
  }

  if (pin) {
    const { error: pinError } = await supabase.from("child_pins").upsert({ child_id: child.id, pin_hash: hashPin(pin) });
    if (pinError) {
      redirect(
        setupActionErrorPath({
          source,
          fallbackPath: "/children",
          step: "children",
          message: childSaveFailureMessage({ target: "pin" })
        })
      );
    }
  }

  const { data: onboardingState, error: onboardingError } = await upsertOnboardingProgress(supabase, context.user.id, {
    children_added: true,
    rewards_set: true
  });
  if (onboardingError || !onboardingState) {
    redirect(
      setupActionErrorPath({
        source,
        fallbackPath: "/children",
        step: "children",
        message: childSaveFailureMessage({ target: "onboarding" })
      })
    );
  }
  revalidatePath("/children");
  revalidatePath("/onboarding");
  revalidatePath("/child");
  revalidatePath("/dashboard");
  revalidatePath("/approvals");
  revalidatePath("/earnings");
  revalidatePath("/reports");
  if (isOnboardingSource(source)) {
    redirect("/onboarding?step=children&updated=child");
  }
  redirect(id ? `/children/${child.id}?updated=child` : "/children?updated=child");
}

export async function archiveChildAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const context = await getAppContext({ requireSubscription: true, requireOnboarding: true });
  if (!context.household) redirect("/onboarding");
  const id = formString(formData, "id");
  const { data: child, error: childError } = await supabase
    .from("children")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("household_id", context.household.id)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();
  if (childError || !child) {
    redirect(`/children?error=${encodeURIComponent(childArchiveFailureMessage({ target: "child", wroteRow: Boolean(child) }))}`);
  }

  const archivedAt = new Date().toISOString();
  const { error: completionsError } = await supabase
    .from("chore_completions")
    .update({ status: "rejected", reviewed_at: archivedAt, reviewed_by: context.user.id })
    .eq("household_id", context.household.id)
    .in("status", ["collecting", "pending"])
    .or(`completed_by_child_id.eq.${id},participant_child_ids.cs.{${id}}`);
  if (completionsError) {
    redirect(`/children?error=${encodeURIComponent(childArchiveFailureMessage({ target: "completions" }))}`);
  }

  const { error: assignmentError } = await supabase.from("chore_assignments").delete().eq("child_id", id);
  if (assignmentError) {
    redirect(`/children?error=${encodeURIComponent(childArchiveFailureMessage({ target: "assignments" }))}`);
  }
  revalidatePath("/children");
  revalidatePath("/chores");
  revalidatePath("/approvals");
  revalidatePath("/child");
  revalidatePath("/dashboard");
  revalidatePath("/earnings");
  revalidatePath("/reports");
  redirect("/children?archived=child");
}

export async function saveChoreAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const source = formData.get("source");
  const isOnboarding = isOnboardingSource(source);
  const context = await getAppContext(appContextOptionsForSetupAction(source));
  if (!context.household) redirect("/onboarding");

  const id = formString(formData, "id");
  const title = formString(formData, "title").trim();
  const description = formString(formData, "description").trim();
  const titleError = choreTitleError(title);
  if (titleError) {
    redirect(setupActionErrorPath({ source, fallbackPath: "/chores", step: "chores", message: titleError }));
  }
  const descriptionError = choreDescriptionError(description);
  if (descriptionError) {
    redirect(setupActionErrorPath({ source, fallbackPath: "/chores", step: "chores", message: descriptionError }));
  }

  const requestedChildIds = formData.getAll("child_ids").map(String).filter(Boolean);
  const { data: availableChildren, error: childrenError } = await supabase
    .from("children")
    .select("id")
    .eq("household_id", context.household.id)
    .is("archived_at", null);
  if (childrenError || !availableChildren) {
    redirect(
      setupActionErrorPath({
        source,
        fallbackPath: "/chores",
        step: "chores",
        message: choreSaveFailureMessage({ target: "children", wroteRow: Boolean(availableChildren) })
      })
    );
  }
  let childIds: string[];
  try {
    childIds = validateChoreAssignmentIds({
      availableChildIds: availableChildren.map((child) => child.id),
      requestedChildIds
    });
  } catch (error) {
    redirect(
      setupActionErrorPath({
        source,
        fallbackPath: "/chores",
        step: "chores",
        message: error instanceof Error ? error.message : "Invalid chore assignments."
      })
    );
  }

  let rewardCents: number;
  try {
    rewardCents = rewardCentsFromInput(formData.get("reward"));
  } catch (error) {
    redirect(
      setupActionErrorPath({
        source,
        fallbackPath: "/chores",
        step: "chores",
        message: error instanceof Error ? error.message : "Invalid reward amount."
      })
    );
  }

  let frequency;
  let sharedCompletionMode;
  const customSchedule = formString(formData, "custom_schedule").trim();
  try {
    frequency = validateChoreScheduleFrequency(formString(formData, "frequency", "daily"));
    sharedCompletionMode = validateSharedCompletionMode(formString(formData, "shared_completion_mode", "any"));
    const customScheduleError = choreCustomScheduleError({ frequency, value: customSchedule });
    if (customScheduleError) throw new Error(customScheduleError);
  } catch (error) {
    redirect(
      setupActionErrorPath({
        source,
        fallbackPath: "/chores",
        step: "chores",
        message: error instanceof Error ? error.message : "Invalid chore settings."
      })
    );
  }

  const payload = {
    household_id: context.household.id,
    title,
    description: description || null,
    reward_cents: rewardCents,
    frequency,
    custom_schedule: customSchedule || null,
    shared_completion_mode: sharedCompletionMode,
    split_payment_enabled: checked(formData, "split_payment_enabled"),
    updated_at: new Date().toISOString()
  };

  const { data: chore, error } = id
    ? await supabase.from("chores").update(payload).eq("id", id).eq("household_id", context.household.id).eq("active", true).select("id,title").single()
    : await supabase.from("chores").insert({ ...payload, active: true }).select("id,title").single();

  if (error || !chore) {
    redirect(
      setupActionErrorPath({
        source,
        fallbackPath: "/chores",
        step: "chores",
        message: choreSaveFailureMessage({ target: "chore", wroteRow: Boolean(chore) })
      })
    );
  }

  const { error: deleteAssignmentsError } = await supabase.from("chore_assignments").delete().eq("chore_id", chore.id);
  if (deleteAssignmentsError) {
    redirect(
      setupActionErrorPath({
        source,
        fallbackPath: "/chores",
        step: "chores",
        message: choreSaveFailureMessage({ target: "assignments" })
      })
    );
  }
  if (childIds.length) {
    const { error: insertAssignmentsError } = await supabase
      .from("chore_assignments")
      .insert(childIds.map((child_id) => ({ chore_id: chore.id, child_id })));
    if (insertAssignmentsError) {
      redirect(
        setupActionErrorPath({
          source,
          fallbackPath: "/chores",
          step: "chores",
          message: choreSaveFailureMessage({ target: "assignments" })
        })
      );
    }
  }

  const { data: onboardingState, error: onboardingError } = await upsertOnboardingProgress(supabase, context.user.id, {
    first_chore_created: true
  });
  if (onboardingError || !onboardingState) {
    redirect(
      setupActionErrorPath({
        source,
        fallbackPath: "/chores",
        step: "chores",
        message: choreSaveFailureMessage({ target: "onboarding", wroteRow: Boolean(onboardingState) })
      })
    );
  }

  const { error: notificationError } = await createNotification({
    householdId: context.household.id,
    userId: context.user.id,
    type: "chore_assigned",
    title: "Chore assigned",
    body: `${chore.title} is ready for the assigned child profiles.`
  });
  if (notificationError) {
    redirect(
      setupActionErrorPath({
        source,
        fallbackPath: "/chores",
        step: "chores",
        message: choreSaveFailureMessage({ target: "notification" })
      })
    );
  }

  revalidatePath("/chores");
  revalidatePath("/dashboard");
  revalidatePath("/child");
  revalidatePath("/onboarding");
  revalidatePath("/approvals");
  revalidatePath("/earnings");
  revalidatePath("/reports");
  revalidatePath("/notifications");
  redirect(isOnboarding ? "/onboarding?step=example&updated=chore" : "/chores?updated=chore");
}

export async function deleteChoreAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const context = await getAppContext({ requireSubscription: true, requireOnboarding: true });
  if (!context.household) redirect("/onboarding");
  const id = formString(formData, "id");
  const { data: chore, error } = await supabase
    .from("chores")
    .update({ active: false })
    .eq("id", id)
    .eq("household_id", context.household.id)
    .eq("active", true)
    .select("id")
    .maybeSingle();
  if (error || !chore) {
    redirect(`/chores?error=${encodeURIComponent(choreSaveFailureMessage({ target: "delete", wroteRow: Boolean(chore) }))}`);
  }
  const archivedAt = new Date().toISOString();
  const { error: completionsError } = await supabase
    .from("chore_completions")
    .update({ status: "rejected", reviewed_at: archivedAt, reviewed_by: context.user.id })
    .eq("chore_id", chore.id)
    .eq("household_id", context.household.id)
    .in("status", ["collecting", "pending"]);
  if (completionsError) {
    redirect(`/chores?error=${encodeURIComponent(choreSaveFailureMessage({ target: "completions" }))}`);
  }
  revalidatePath("/chores");
  revalidatePath("/dashboard");
  revalidatePath("/approvals");
  revalidatePath("/child");
  revalidatePath("/earnings");
  revalidatePath("/reports");
  redirect("/chores?archived=chore");
}

export async function saveChoreCommentAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const context = await getAppContext({ requireSubscription: true, requireOnboarding: true });
  if (!context.household) redirect("/onboarding");

  const choreId = formString(formData, "chore_id");
  const source = safeRedirectPath(formString(formData, "source", "/chores"), "/chores");
  const note = formString(formData, "note");
  const alertLabel = normalizeChoreCommentAlert(formString(formData, "alert_label"));
  const inferredAlertKind = alertLabel === "Vacuum not working" || alertLabel === "Couldn't complete chore" ? "chore_issue" : "supply_note";
  const kind = alertLabel ? normalizeChoreCommentKind(inferredAlertKind) : normalizeChoreCommentKind(formString(formData, "kind", "household_note"));
  const noteText = note || alertLabel || "";
  const noteError = choreCommentTextError(noteText);
  if (noteError) {
    redirect(`${source}?error=${encodeURIComponent(noteError)}`);
  }

  const { data: chore, error: choreError } = await supabase
    .from("chores")
    .select("id,title")
    .eq("id", choreId)
    .eq("household_id", context.household.id)
    .eq("active", true)
    .maybeSingle();
  if (choreError || !chore) {
    redirect(`${source}?error=${encodeURIComponent("Chore not found for this household note.")}`);
  }

  const { data: comment, error: commentError } = await supabase
    .from("chore_comments")
    .insert({
      chore_id: chore.id,
      household_id: context.household.id,
      author_id: context.user.id,
      kind,
      alert_label: alertLabel,
      note: noteText
    })
    .select("id")
    .single();
  if (commentError || !comment) {
    redirect(`${source}?error=${encodeURIComponent("Household note could not be saved. Please refresh and try again.")}`);
  }

  const { error: notificationError } = await createNotification({
    householdId: context.household.id,
    userId: context.user.id,
    type: "chore_comment",
    title: choreCommentKindLabel(kind),
    body: `${chore.title}: ${noteText}`
  });
  if (notificationError) {
    redirect(`${source}?error=${encodeURIComponent("Household note was saved, but the notification could not be created.")}`);
  }

  revalidatePath("/chores");
  revalidatePath("/dashboard");
  revalidatePath("/child");
  revalidatePath("/notifications");
  redirect(`${source}?comment=added`);
}

export async function markChoreCommentReadAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const context = await getAppContext({ requireSubscription: true, requireOnboarding: true });
  if (!context.household) redirect("/onboarding");

  const commentId = formString(formData, "comment_id");
  const source = safeRedirectPath(formString(formData, "source", "/chores"), "/chores");
  const { data: comment, error } = await supabase
    .from("chore_comments")
    .update({ read_at: new Date().toISOString() })
    .eq("id", commentId)
    .eq("household_id", context.household.id)
    .select("id")
    .maybeSingle();

  if (error || !comment) {
    redirect(`${source}?error=${encodeURIComponent("Household note could not be marked read.")}`);
  }

  revalidatePath("/chores");
  revalidatePath("/dashboard");
  revalidatePath("/child");
  redirect(`${source}?comment=read`);
}

export async function completeChoreAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const context = await getAppContext({ requireSubscription: true, requireOnboarding: true });
  if (!context.household) redirect("/onboarding");

  const childId = formString(formData, "child_id");
  const pin = formString(formData, "pin");
  const choreId = formString(formData, "chore_id");
  const participantIds = formData.getAll("participant_child_ids").map(String).filter(Boolean);
  const completedTogether = checked(formData, "completed_together");
  const note = formString(formData, "note");
  const noteError = completionNoteError(note);
  if (noteError) {
    redirect(`/child?error=${encodeURIComponent(noteError)}`);
  }
  const dueOn = new Date().toISOString().slice(0, 10);

  const { data: pinRecord, error: pinError } = await supabase.from("child_pins").select("pin_hash").eq("child_id", childId).maybeSingle();
  if (pinError) {
    redirect(`/child?error=${encodeURIComponent("Unable to verify this child PIN right now.")}`);
  }
  if (!pinRecord?.pin_hash) {
    redirect(`/child?error=${encodeURIComponent("This child profile needs a PIN before chores can be completed.")}`);
  }
  if (pinRecord?.pin_hash && !verifyPin(pin, pinRecord.pin_hash)) {
    redirect(`/child?error=${encodeURIComponent("Incorrect child PIN.")}`);
  }

  const [
    { data: chore, error: choreError },
    { data: assignments, error: assignmentsError },
    { data: activeChildren, error: activeChildrenError },
    { data: completionRows, error: completionsError }
  ] = await Promise.all([
    supabase
      .from("chores")
      .select("title,frequency,custom_schedule,created_at,shared_completion_mode,split_payment_enabled")
      .eq("id", choreId)
      .eq("household_id", context.household.id)
      .eq("active", true)
      .single(),
    supabase.from("chore_assignments").select("child_id").eq("chore_id", choreId),
    supabase.from("children").select("id").eq("household_id", context.household.id).is("archived_at", null),
    supabase
      .from("chore_completions")
      .select("id,status,participant_child_ids")
      .eq("chore_id", choreId)
      .eq("household_id", context.household.id)
      .eq("due_on", dueOn)
      .in("status", ["collecting", "pending", "approved"])
  ]);

  if (choreError || !chore) {
    redirect(`/child?error=${encodeURIComponent("Chore not found.")}`);
  }
  if (assignmentsError || !assignments) {
    redirect(`/child?error=${encodeURIComponent("Chore assignments could not be loaded.")}`);
  }
  if (activeChildrenError || !activeChildren) {
    redirect(`/child?error=${encodeURIComponent("Active child profiles could not be loaded.")}`);
  }
  if (completionsError || !completionRows) {
    redirect(`/child?error=${encodeURIComponent("Existing chore completions could not be loaded.")}`);
  }
  if (
    !isChoreDueOn({
      frequency: chore.frequency,
      customSchedule: chore.custom_schedule,
      createdAt: chore.created_at,
      dueDate: new Date()
    })
  ) {
    redirect(`/child?error=${encodeURIComponent("This chore is not due today.")}`);
  }
  const existingCompletion =
    (completionRows || []).find((completion) => completion.status === "approved") ||
    (completionRows || []).find((completion) => completion.status === "pending") ||
    (completionRows || []).find((completion) => completion.status === "collecting");
  const submissionError = completionSubmissionError(existingCompletion?.status);
  if (submissionError) {
    redirect(`/child?error=${encodeURIComponent(submissionError)}`);
  }
  if (existingCompletion && !canAddCompletionProgress(existingCompletion.status)) {
    redirect(`/child?error=${encodeURIComponent("This chore cannot be updated right now.")}`);
  }

  let participants: string[];
  let nextState: ReturnType<typeof nextCompletionState>;
  try {
    const assignedChildIds = activeAssignedChildIds({
      assignedChildIds: (assignments || []).map((assignment) => assignment.child_id),
      activeChildIds: activeChildren.map((child) => child.id)
    });
    participants = validateAssignedParticipants({
      assignedChildIds,
      completedByChildId: childId,
      requestedParticipantIds: participantIds,
      completedTogether,
      splitPaymentEnabled: Boolean(chore.split_payment_enabled)
    });
    const progressError = completionProgressContributionError({
      existingStatus: existingCompletion?.status,
      existingParticipantIds: existingCompletion?.participant_child_ids || [],
      newParticipantIds: participants
    });
    if (progressError) {
      throw new Error(progressError);
    }
    nextState = nextCompletionState({
      sharedCompletionMode: chore.shared_completion_mode,
      assignedChildIds,
      existingParticipantIds: existingCompletion?.participant_child_ids || [],
      newParticipantIds: participants
    });
  } catch (error) {
    redirect(`/child?error=${encodeURIComponent(error instanceof Error ? error.message : "Invalid chore completion.")}`);
  }

  const completionPayload = {
    completed_by_child_id: childId,
    completed_together: completedTogether,
    participant_child_ids: nextState.participants,
    status: nextState.status,
    note: note || null,
    completed_at: new Date().toISOString()
  };

  if (existingCompletion) {
    const { data: updatedCompletion, error: completionError } = await supabase
      .from("chore_completions")
      .update(completionPayload)
      .eq("id", existingCompletion.id)
      .eq("status", "collecting")
      .select("id")
      .maybeSingle();
    if (completionError || !updatedCompletion) {
      redirect(
        `/child?error=${encodeURIComponent(
          completionWriteFailureMessage({ errorCode: completionError?.code, wroteRow: Boolean(updatedCompletion) })
        )}`
      );
    }
  } else {
    const { data: insertedCompletion, error: completionError } = await supabase
      .from("chore_completions")
      .insert({
        ...completionPayload,
        chore_id: choreId,
        household_id: context.household.id,
        due_on: dueOn
      })
      .select("id")
      .single();
    if (completionError || !insertedCompletion) {
      redirect(
        `/child?error=${encodeURIComponent(
          completionWriteFailureMessage({ errorCode: completionError?.code, wroteRow: Boolean(insertedCompletion) })
        )}`
      );
    }
  }

  const { error: notificationError } = await createNotification({
    householdId: context.household.id,
    userId: context.user.id,
    type: nextState.status === "pending" ? "approval_required" : "chore_progress",
    title: nextState.status === "pending" ? "Approval required" : "Shared chore progress",
    body:
      nextState.status === "pending"
        ? `${chore.title} was marked complete and is waiting for review.`
        : `${chore.title} is still active until every assigned child marks completion.`
  });
  if (notificationError) {
    redirect(`/child?error=${encodeURIComponent(completionSideEffectFailureMessage({ target: "notification" }))}`);
  }

  if (nextState.status === "pending") {
    // Milestone notices are best-effort: the completion is already saved, so a
    // failure here must not surface as an error to the child.
    const weekStartIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: milestoneChores }, { data: todayCompletions }, { data: weekCompletions }] = await Promise.all([
      supabase
        .from("chores")
        .select("id,frequency,custom_schedule,created_at,chore_assignments(child_id)")
        .eq("household_id", context.household.id)
        .eq("active", true),
      supabase
        .from("chore_completions")
        .select("chore_id")
        .eq("household_id", context.household.id)
        .eq("due_on", dueOn)
        .in("status", ["pending", "approved"]),
      supabase
        .from("chore_completions")
        .select("chore_id")
        .eq("household_id", context.household.id)
        .gte("completed_at", weekStartIso)
        .in("status", ["pending", "approved"])
    ]);
    if (milestoneChores && todayCompletions && weekCompletions) {
      const milestones = choreMilestones({
        chores: milestoneChores.map((row) => ({
          id: row.id,
          frequency: row.frequency,
          custom_schedule: row.custom_schedule,
          created_at: row.created_at,
          assignedChildIds: (row.chore_assignments || []).map((assignment: { child_id: string }) => assignment.child_id)
        })),
        activeChildIds: activeChildren.map((child) => child.id),
        todayCompletedChoreIds: todayCompletions.map((row) => row.chore_id),
        weeklyCompletedChoreIds: weekCompletions.map((row) => row.chore_id)
      });
      for (const payload of milestoneNotificationPayloads(milestones)) {
        await createNotification({
          householdId: context.household.id,
          userId: context.user.id,
          type: payload.type,
          title: payload.title,
          body: payload.body
        });
      }
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/approvals");
  revalidatePath("/notifications");
  redirect(`/child?completed=${completionRedirectState(nextState.status)}`);
}

export async function reviewCompletionAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const source = formData.get("source");
  const isOnboarding = isOnboardingSource(source);
  const context = await getAppContext(appContextOptionsForSetupAction(source));
  if (!context.household) redirect("/onboarding");

  const completionId = formString(formData, "completion_id");
  const action = formString(formData, "action");
  const note = formString(formData, "note") || null;
  const noteError = approvalNoteError(note || "");
  if (noteError) {
    redirect(setupActionErrorPath({ source, fallbackPath: "/approvals", step: "approve", message: noteError }));
  }
  if (!isReviewAction(action)) {
    redirect(setupActionErrorPath({ source, fallbackPath: "/approvals", step: "approve", message: "Invalid review action." }));
  }

  const { data: completion, error } = await supabase
    .from("chore_completions")
    .select("id,chore_id,household_id,status,completed_together,participant_child_ids,completed_by_child_id,chores(title,reward_cents,split_payment_enabled)")
    .eq("id", completionId)
    .eq("household_id", context.household.id)
    .single();

  if (error || !completion) {
    redirect(setupActionErrorPath({ source, fallbackPath: "/approvals", step: "approve", message: "Completion not found" }));
  }
  if (!canReviewCompletion(completion.status)) {
    redirect(setupActionErrorPath({ source, fallbackPath: "/approvals", step: "approve", message: "This completion has already been reviewed." }));
  }

  const { data: reviewedCompletion, error: reviewError } = await supabase
    .from("chore_completions")
    .update({ status: action, reviewed_at: new Date().toISOString(), reviewed_by: context.user.id })
    .eq("id", completionId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (reviewError || !reviewedCompletion) {
    redirect(
      setupActionErrorPath({
        source,
        fallbackPath: "/approvals",
        step: "approve",
        message: reviewWriteFailureMessage({ wroteRow: Boolean(reviewedCompletion) })
      })
    );
  }

  const { error: eventError } = await supabase.from("approval_events").insert({ completion_id: completionId, action, note, actor_id: context.user.id });
  if (eventError) {
    redirect(
      setupActionErrorPath({
        source,
        fallbackPath: "/approvals",
        step: "approve",
        message: approvalSideEffectFailureMessage({ target: "event" })
      })
    );
  }

  if (action === "approved") {
    const chore = Array.isArray(completion.chores) ? completion.chores[0] : completion.chores;
    const reward = Number(chore?.reward_cents || 0);
    const participants = completion.participant_child_ids?.length
      ? completion.participant_child_ids
      : [completion.completed_by_child_id].filter((id): id is string => Boolean(id));
    const splitReward = shouldSplitCompletionReward({
      splitPaymentEnabled: Boolean(chore?.split_payment_enabled),
      completedTogether: Boolean(completion.completed_together)
    });
    const payouts = splitRewardCents({
      rewardCents: reward,
      participantIds: participants,
      splitPaymentEnabled: splitReward
    });

    const { error: ledgerError } = await supabase
      .from("earnings_ledger")
      .upsert(
        payouts.map((payout) => ({
          household_id: completion.household_id,
          child_id: payout.childId,
          chore_id: completion.chore_id,
          completion_id: completion.id,
          amount_cents: payout.amountCents,
          status: "approved",
          memo: splitReward && payouts.length > 1 ? "Completed together split payment" : "Approved chore"
        })),
        { onConflict: "completion_id,child_id", ignoreDuplicates: true }
      );
    if (ledgerError) {
      redirect(
        setupActionErrorPath({
          source,
          fallbackPath: "/approvals",
          step: "approve",
          message: approvalSideEffectFailureMessage({ target: "earnings" })
        })
      );
    }

    const { data: onboardingState, error: onboardingError } = await upsertOnboardingProgress(supabase, context.user.id, {
      example_approved: true,
      earnings_reviewed: true
    });
    if (onboardingError || !onboardingState) {
      redirect(
        setupActionErrorPath({
          source,
          fallbackPath: "/approvals",
          step: "approve",
          message: approvalSideEffectFailureMessage({ target: "onboarding" })
        })
      );
    }
  }

  const { error: notificationError } = await createNotification({
    householdId: context.household.id,
    userId: context.user.id,
    type: `chore_${action}`,
    title: action === "approved" ? "Chore approved" : action === "rejected" ? "Chore rejected" : "Redo requested",
    body: action === "approved" ? "Approved earnings were added to the ledger." : "The chore review has been recorded."
  });
  if (notificationError) {
    redirect(
      setupActionErrorPath({
        source,
        fallbackPath: "/approvals",
        step: "approve",
        message: approvalSideEffectFailureMessage({ target: "notification" })
      })
    );
  }

  revalidatePath("/approvals");
  revalidatePath("/earnings");
  revalidatePath("/dashboard");
  revalidatePath("/child");
  revalidatePath("/reports");
  revalidatePath("/notifications");
  if (isOnboarding) {
    revalidatePath("/onboarding");
    redirect("/onboarding?step=earnings");
  }
  redirect(`/approvals?reviewed=${action}`);
}

export async function submitExampleCompletionAction() {
  const supabase = await createSupabaseServerClient();
  const context = await getAppContext();
  if (!context.household) redirect("/onboarding");

  const [{ data: chore, error: choreError }, { data: child, error: childError }] = await Promise.all([
    supabase.from("chores").select("id,title").eq("household_id", context.household.id).eq("active", true).limit(1).maybeSingle(),
    supabase.from("children").select("id,name").eq("household_id", context.household.id).is("archived_at", null).limit(1).maybeSingle()
  ]);

  if (choreError || childError) {
    redirect(`/onboarding?step=example&error=${encodeURIComponent("Example setup data could not be loaded.")}`);
  }
  if (!chore || !child) {
    redirect(`/onboarding?error=${encodeURIComponent("Add a child and create a chore before submitting the example completion.")}`);
  }

  const { data: existing, error: existingError } = await supabase
    .from("chore_completions")
    .select("id")
    .eq("chore_id", chore.id)
    .eq("household_id", context.household.id)
    .in("status", ["collecting", "pending"])
    .maybeSingle();
  if (existingError) {
    redirect(`/onboarding?step=example&error=${encodeURIComponent("Existing example completions could not be loaded.")}`);
  }

  if (!existing) {
    const { data: completion, error: completionError } = await supabase
      .from("chore_completions")
      .insert({
        chore_id: chore.id,
        household_id: context.household.id,
        completed_by_child_id: child.id,
        completed_together: false,
        participant_child_ids: [child.id],
        status: "pending",
        note: "Onboarding example completion",
        due_on: new Date().toISOString().slice(0, 10)
      })
      .select("id")
      .single();
    if (completionError || !completion) {
      redirect(
        `/onboarding?step=example&error=${encodeURIComponent(
          exampleCompletionFailureMessage({ target: "completion", wroteRow: Boolean(completion) })
        )}`
      );
    }
  }

  const { error: notificationError } = await createNotification({
    householdId: context.household.id,
    userId: context.user.id,
    type: "approval_required",
    title: "Approval required",
    body: `${chore.title} is ready to approve in onboarding.`
  });
  if (notificationError) {
    redirect(
      `/onboarding?step=example&error=${encodeURIComponent(
        exampleCompletionFailureMessage({ target: "notification" })
      )}`
    );
  }

  revalidatePath("/onboarding");
  redirect("/onboarding?step=approve");
}

export async function recordPayoutAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const context = await getAppContext({ requireSubscription: true, requireOnboarding: true });
  const source = safeRedirectPath(formString(formData, "source", "/earnings"), "/earnings");
  if (!context.household) redirect("/earnings");

  const childId = formString(formData, "child_id");
  const rawAmount = formData.get("amount");

  let amountCents: number;
  try {
    amountCents = rewardCentsFromInput(rawAmount);
    if (amountCents <= 0) throw new Error("Payout amount must be greater than $0.");
  } catch (error) {
    redirect(`${source}?error=${encodeURIComponent(error instanceof Error ? error.message : "Invalid payout amount.")}`);
  }

  const { data: child, error: childError } = await supabase
    .from("children")
    .select("id,name")
    .eq("id", childId)
    .eq("household_id", context.household.id)
    .maybeSingle();
  if (childError || !child) {
    redirect(`${source}?error=${encodeURIComponent("Child profile not found.")}`);
  }

  const { data: ledger, error: ledgerError } = await supabase
    .from("earnings_ledger")
    .select("amount_cents")
    .eq("household_id", context.household.id)
    .eq("child_id", childId)
    .eq("status", "approved");
  if (ledgerError) {
    redirect(`${source}?error=${encodeURIComponent("Balance could not be loaded. Please try again.")}`);
  }
  const balance = (ledger || []).reduce((sum, row) => sum + Number(row.amount_cents || 0), 0);
  if (amountCents > balance) {
    const fmt = (c: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);
    redirect(`${source}?error=${encodeURIComponent(`Payout of ${fmt(amountCents)} exceeds ${child.name}'s balance of ${fmt(balance)}.`)}`);
  }

  const { error: payoutError } = await supabase.from("earnings_ledger").insert({
    household_id: context.household.id,
    child_id: childId,
    amount_cents: -amountCents,
    status: "approved",
    memo: "Payout"
  });
  if (payoutError) {
    redirect(`${source}?error=${encodeURIComponent("Payout could not be saved. Please try again.")}`);
  }

  revalidatePath("/earnings");
  revalidatePath("/children");
  revalidatePath(`/children/${childId}`);
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  redirect(`${source}?payout=recorded`);
}

export async function markNotificationReadAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const context = await getAppContext({ requireSubscription: true, requireOnboarding: true });
  const source = safeRedirectPath(formString(formData, "source"), "/notifications");
  const { data: notification, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", formString(formData, "id"))
    .eq("user_id", context.user.id)
    .select("id")
    .maybeSingle();
  if (error || !notification) {
    redirect(`${source}?error=${encodeURIComponent(notificationWriteFailureMessage({ action: "single", wroteRow: Boolean(notification) }))}`);
  }
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  revalidatePath("/child");
  redirect(source === "/notifications" ? "/notifications?updated=single" : source);
}

export async function sendChildReminderAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const context = await getAppContext({ requireSubscription: true, requireOnboarding: true });
  if (!context.household) redirect("/onboarding");

  const childId = formString(formData, "child_id");
  const { data: child, error: childError } = await supabase
    .from("children")
    .select("id,name")
    .eq("id", childId)
    .eq("household_id", context.household.id)
    .is("archived_at", null)
    .maybeSingle();
  if (childError || !child) {
    redirect(`/children?error=${encodeURIComponent("This child profile could not be found.")}`);
  }

  const { error: notificationError } = await createNotification({
    householdId: context.household.id,
    userId: context.user.id,
    type: "child_reminder",
    title: `Chore reminder for ${child.name}`,
    body: reminderBody({ childName: child.name, requested: formString(formData, "message") })
  });
  if (notificationError) {
    redirect(`/children?error=${encodeURIComponent("The reminder could not be sent right now.")}`);
  }

  revalidatePath("/child");
  revalidatePath("/notifications");
  redirect(`/children?reminder=${encodeURIComponent(child.name)}`);
}

export async function saveBuddyStyleAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const context = await getAppContext({ requireSubscription: true, requireOnboarding: true });
  if (!context.household) redirect("/onboarding");

  const source = safeRedirectPath(formString(formData, "source"), "/child");
  const style = normalizeBuddyStyle({
    pot: formString(formData, "pot"),
    bloom: formString(formData, "bloom"),
    face: formString(formData, "face"),
    accessory: formString(formData, "accessory")
  });

  const { data: updated, error } = await supabase
    .from("households")
    .update({ buddy_style: style, updated_at: new Date().toISOString() })
    .eq("id", context.household.id)
    .select("id")
    .maybeSingle();
  if (error || !updated) {
    redirect(`${source}?error=${encodeURIComponent("Sprout's new look could not be saved right now.")}`);
  }

  revalidatePath("/child");
  revalidatePath("/dashboard");
  redirect(`${source}?buddy=saved`);
}

export async function sendChoreReminderAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const context = await getAppContext({ requireSubscription: true, requireOnboarding: true });
  if (!context.household) redirect("/onboarding");

  const choreId = formString(formData, "chore_id");
  const source = safeRedirectPath(formString(formData, "source"), "/chores");
  const { data: chore, error: choreError } = await supabase
    .from("chores")
    .select("id,title,chore_assignments(children(name,archived_at))")
    .eq("id", choreId)
    .eq("household_id", context.household.id)
    .eq("active", true)
    .maybeSingle();
  if (choreError || !chore) {
    redirect(`${source}?error=${encodeURIComponent("This chore could not be found.")}`);
  }

  const assignedNames = (chore.chore_assignments || [])
    .map((assignment: { children: { name: string; archived_at: string | null } | { name: string; archived_at: string | null }[] | null }) =>
      Array.isArray(assignment.children) ? assignment.children[0] : assignment.children
    )
    .filter((child): child is { name: string; archived_at: string | null } => Boolean(child && !child.archived_at))
    .map((child) => child.name);

  const { error: notificationError } = await createNotification({
    householdId: context.household.id,
    userId: context.user.id,
    type: "child_reminder",
    title: `Chore reminder: ${chore.title}`,
    body: assignedNames.length
      ? `${assignedNames.join(" and ")}, your parent sent a reminder — "${chore.title}" is waiting for you.`
      : `Your parent sent a reminder — "${chore.title}" is waiting.`
  });
  if (notificationError) {
    redirect(`${source}?error=${encodeURIComponent("The reminder could not be sent right now.")}`);
  }

  revalidatePath("/child");
  revalidatePath("/notifications");
  redirect(`${source}?reminder=${encodeURIComponent(chore.title)}`);
}

export async function markAllNotificationsReadAction() {
  const supabase = await createSupabaseServerClient();
  const context = await getAppContext({ requireSubscription: true, requireOnboarding: true });
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", context.user.id)
    .is("read_at", null);
  if (error) {
    redirect(`/notifications?error=${encodeURIComponent(notificationWriteFailureMessage({ action: "all" }))}`);
  }
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  redirect("/notifications?updated=all");
}

export async function completeOnboardingAction() {
  const supabase = await createSupabaseServerClient();
  const context = await getAppContext();
  const { data: state, error } = await supabase
    .from("onboarding_state")
    .select("household_created,children_added,rewards_set,first_chore_created,example_approved,earnings_reviewed,pwa_reviewed")
    .eq("user_id", context.user.id)
    .maybeSingle();
  if (error) {
    redirect(
      `/onboarding?error=${encodeURIComponent(
        onboardingCompletionWriteFailureMessage({ target: "state", wroteRow: Boolean(state) })
      )}`
    );
  }
  const [
    { count: activeChildrenCount, error: activeChildrenError },
    { count: activeChoresCount, error: activeChoresError },
    { count: approvedExampleCount, error: approvedExampleError }
  ] = context.household
    ? await Promise.all([
        supabase
          .from("children")
          .select("id", { count: "exact", head: true })
          .eq("household_id", context.household.id)
          .is("archived_at", null),
        supabase
          .from("chores")
          .select("id", { count: "exact", head: true })
          .eq("household_id", context.household.id)
          .eq("active", true),
        supabase
          .from("chore_completions")
          .select("id", { count: "exact", head: true })
          .eq("household_id", context.household.id)
          .eq("status", "approved")
          .eq("note", "Onboarding example completion")
      ])
    : [
        { count: 0, error: null },
        { count: 0, error: null },
        { count: 0, error: null }
      ];
  const dataError = activeChildrenError || activeChoresError || approvedExampleError;
  if (dataError) {
    redirect(`/onboarding?error=${encodeURIComponent("Onboarding setup data could not be verified.")}`);
  }
  const missingData = missingOnboardingData({
    hasHousehold: Boolean(context.household),
    activeChildrenCount: activeChildrenCount || 0,
    activeChoresCount: activeChoresCount || 0,
    approvedExampleCount: approvedExampleCount || 0
  });
  if (missingData.length) {
    redirect(`/onboarding?error=${encodeURIComponent(`Finish onboarding setup first: ${missingData.join(", ")}.`)}`);
  }
  const verifiedState = {
    household_created: Boolean(state?.household_created || context.household),
    children_added: Boolean(state?.children_added || activeChildrenCount),
    rewards_set: Boolean(state?.rewards_set || activeChildrenCount),
    first_chore_created: Boolean(state?.first_chore_created || activeChoresCount),
    example_approved: Boolean(state?.example_approved || approvedExampleCount),
    earnings_reviewed: Boolean(state?.earnings_reviewed || approvedExampleCount),
    pwa_reviewed: true
  };
  const missing = missingOnboardingSteps(verifiedState);
  if (missing.length) {
    redirect(`/onboarding?error=${encodeURIComponent(`Finish onboarding first: ${missing.join(", ")}.`)}`);
  }

  const { data: updatedState, error: stateError } = await upsertOnboardingProgress(supabase, context.user.id, verifiedState);
  if (stateError || !updatedState) {
    redirect(
      `/onboarding?error=${encodeURIComponent(
        onboardingCompletionWriteFailureMessage({ target: "state", wroteRow: Boolean(updatedState) })
      )}`
    );
  }

  const { data: updatedProfile, error: profileError } = await supabase
    .from("profiles")
    .update({ onboarding_complete: true })
    .eq("id", context.user.id)
    .select("id")
    .maybeSingle();
  if (profileError || !updatedProfile) {
    redirect(
      `/onboarding?error=${encodeURIComponent(
        onboardingCompletionWriteFailureMessage({ target: "profile", wroteRow: Boolean(updatedProfile) })
      )}`
    );
  }

  redirect("/dashboard");
}

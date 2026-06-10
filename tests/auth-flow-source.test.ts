import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

function actionSource(source: string, actionName: string) {
  const start = source.indexOf(`export async function ${actionName}`);
  assert.notEqual(start, -1, `${actionName} should exist`);
  const next = source.indexOf("\nexport async function ", start + 1);
  return next === -1 ? source.slice(start) : source.slice(start, next);
}

describe("auth flow source safeguards", () => {
  it("sanitizes rendered return paths across sign-in and password reset forms", () => {
    const signInPage = readFileSync("src/app/(auth)/sign-in/page.tsx", "utf8");
    const signUpPage = readFileSync("src/app/(auth)/sign-up/page.tsx", "utf8");
    const forgotPasswordPage = readFileSync("src/app/(auth)/forgot-password/page.tsx", "utf8");
    const actions = readFileSync("src/lib/actions.ts", "utf8");

    assert.match(signInPage, /const next = safeRedirectPath\(params\.next, "\/dashboard"\)/);
    assert.match(signInPage, /<input type="hidden" name="next" value=\{next\} \/>/);
    assert.match(signInPage, /href=\{`\/sign-up\?next=\$\{encodeURIComponent\(next\)\}`\}/);
    assert.doesNotMatch(signInPage, /value=\{params\.next \|\| "\/dashboard"\}/);
    assert.match(signUpPage, /const next = safeRedirectPath\(params\.next, "\/dashboard"\)/);
    assert.match(signUpPage, /<input type="hidden" name="next" value=\{next\} \/>/);
    assert.match(signUpPage, /href=\{`\/sign-in\?next=\$\{encodeURIComponent\(next\)\}`\}/);
    assert.match(forgotPasswordPage, /const next = safeRedirectPath\(params\.next, "\/account\/security"\)/);
    assert.match(forgotPasswordPage, /<input type="hidden" name="next" value=\{next\} \/>/);
    assert.match(actions, /const next = safeRedirectPath\(formString\(formData, "next", "\/account\/security"\), "\/account\/security"\)/);
    assert.match(actions, /redirectTo: `\$\{origin\}\/auth\/callback\?next=\$\{encodeURIComponent\(next\)\}`/);
  });

  it("preserves the safe return path after failed sign-in attempts", () => {
    const actions = readFileSync("src/lib/actions.ts", "utf8");

    assert.match(actions, /const next = safeRedirectPath\(formString\(formData, "next", "\/dashboard"\)\)/);
    assert.match(
      actions,
      /redirect\(`\/sign-in\?next=\$\{encodeURIComponent\(next\)\}&error=\$\{encodeURIComponent\(authProviderFailureMessage\(\{ action: "sign-in" \}\)\)\}`\)/
    );
  });

  it("does not expose raw account provider errors in redirects", () => {
    const actions = readFileSync("src/lib/actions.ts", "utf8");

    assert.doesNotMatch(actionSource(actions, "signUpAction"), /encodeURIComponent\(error\.message\)/);
    assert.doesNotMatch(actionSource(actions, "forgotPasswordAction"), /encodeURIComponent\(error\.message\)/);
    assert.doesNotMatch(actionSource(actions, "updatePasswordAction"), /encodeURIComponent\(error\.message\)/);
    assert.doesNotMatch(actionSource(actions, "deleteAccountAction"), /encodeURIComponent\(error\.message/);
    assert.match(actions, /authProviderFailureMessage\(\{ action: "sign-up" \}\)/);
    assert.match(actions, /authProviderFailureMessage\(\{ action: "password-reset" \}\)/);
    assert.match(actions, /authProviderFailureMessage\(\{ action: "password-update" \}\)/);
  });

  it("preserves the safe return path after failed sign-up attempts", () => {
    const actions = readFileSync("src/lib/actions.ts", "utf8");

    assert.match(actionSource(actions, "signUpAction"), /const next = safeRedirectPath\(formString\(formData, "next", "\/dashboard"\)\)/);
    assert.match(
      actionSource(actions, "signUpAction"),
      /redirect\(`\/sign-up\?next=\$\{encodeURIComponent\(next\)\}&error=\$\{encodeURIComponent\(passwordError\)\}`\)/
    );
    assert.match(actionSource(actions, "signUpAction"), /const profileError = profileNameError\(fullName\)/);
    assert.match(
      actionSource(actions, "signUpAction"),
      /redirect\(`\/sign-up\?next=\$\{encodeURIComponent\(next\)\}&error=\$\{encodeURIComponent\(profileError\)\}`\)/
    );
    assert.match(
      actionSource(actions, "signUpAction"),
      /redirect\(`\/sign-up\?next=\$\{encodeURIComponent\(next\)\}&error=\$\{encodeURIComponent\(authProviderFailureMessage\(\{ action: "sign-up" \}\)\)\}`\)/
    );
  });

  it("validates profile names before account profile writes", () => {
    const actions = readFileSync("src/lib/actions.ts", "utf8");
    const signUpPage = readFileSync("src/app/(auth)/sign-up/page.tsx", "utf8");
    const accountPage = readFileSync("src/app/account/page.tsx", "utf8");
    const updateProfile = actionSource(actions, "updateProfileAction");

    assert.match(updateProfile, /const fullName = formString\(formData, "full_name"\)/);
    assert.match(updateProfile, /const nameError = profileNameError\(fullName\)/);
    assert.match(updateProfile, /redirect\(`\/account\?error=\$\{encodeURIComponent\(nameError\)\}`\)/);
    assert.match(updateProfile, /full_name: fullName/);
    assert.doesNotMatch(updateProfile, /full_name: formString\(formData, "full_name"\)/);
    assert.match(signUpPage, /<input id="full_name" name="full_name" required maxLength=\{100\} autoComplete="name" \/>/);
    assert.match(accountPage, /<input id="full_name" name="full_name" maxLength=\{100\} defaultValue=\{profileRow\.full_name \|\| ""\} \/>/);
  });

  it("checks account deletion admin configuration before deleting users", () => {
    const actions = readFileSync("src/lib/actions.ts", "utf8");
    const deleteAccount = actionSource(actions, "deleteAccountAction");

    assert.match(deleteAccount, /if \(!process\.env\.SUPABASE_SERVICE_ROLE_KEY\) \{/);
    assert.match(deleteAccount, /deleteAccountConfigurationFailureMessage\(\)/);
    assert.match(deleteAccount, /const admin = createSupabaseAdminClient\(\)/);
  });

  it("clears the local auth session after account deletion succeeds", () => {
    const actions = readFileSync("src/lib/actions.ts", "utf8");
    const deleteAccount = actionSource(actions, "deleteAccountAction");

    assert.match(deleteAccount, /await admin\.auth\.admin\.deleteUser\(context\.user\.id\)/);
    assert.match(deleteAccount, /const supabase = await createSupabaseServerClient\(\)/);
    assert.match(deleteAccount, /await supabase\.auth\.signOut\(\)/);
    assert.match(deleteAccount, /revalidatePath\("\/", "layout"\)/);
    assert.match(deleteAccount, /redirect\("\/"\)/);
  });

  it("preserves the current protected path when app context redirects to sign in", () => {
    const authContext = readFileSync("src/lib/auth-context.ts", "utf8");

    assert.match(authContext, /async function currentRequestPath\(fallback = "\/dashboard"\)/);
    assert.match(authContext, /safeRedirectPath\(\(await headers\(\)\)\.get\("x-chorely-current-path"\), fallback\)/);
    assert.match(authContext, /async function redirectToSignIn\(\)/);
    assert.match(authContext, /redirect\(`\/sign-in\?next=\$\{encodeURIComponent\(next\)\}`\)/);
    assert.match(authContext, /if \(userError\) \{[\s\S]*?return await redirectToSignIn\(\);[\s\S]*?\}/);
    assert.match(authContext, /if \(!user\) \{[\s\S]*?return await redirectToSignIn\(\);[\s\S]*?\}/);
    assert.doesNotMatch(authContext, /redirect\("\/sign-in"\)/);
  });
});

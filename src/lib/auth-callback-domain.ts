export function authCallbackErrorMessage(input: {
  code?: string | null;
  providerError?: string | null;
  providerErrorDescription?: string | null;
  exchangeError?: string | null;
}) {
  if (input.providerErrorDescription) return input.providerErrorDescription;
  if (input.providerError) return input.providerError;
  if (input.exchangeError) return input.exchangeError;
  if (!input.code) return "Missing auth callback code. Please sign in again.";
  return null;
}

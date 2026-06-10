export function centsToDollars(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100);
}

export function dollarsToCents(value: FormDataEntryValue | null) {
  const number = Number.parseFloat(String(value || "0"));
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.round(number * 100);
}

export function rewardCentsFromInput(value: FormDataEntryValue | null) {
  const rawValue = String(value || "").trim();
  const amount = Number.parseFloat(rawValue);

  if (!rawValue || !Number.isFinite(amount) || amount < 0) {
    throw new Error("Reward must be a valid amount of $0 or more.");
  }

  return Math.round(amount * 100);
}

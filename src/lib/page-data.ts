export function requirePageData<T>(input: { data: T | null; error?: { message?: string | null } | null; label: string }) {
  if (input.error) {
    throw new Error(`${input.label} could not be loaded.`);
  }

  if (input.data === null) {
    throw new Error(`${input.label} could not be loaded.`);
  }

  return input.data;
}

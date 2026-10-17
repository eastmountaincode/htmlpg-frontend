export type DisplayHealth = {
  state: "uninitialized" | "controller_ok" | "retry_wait";
  pending?: boolean;
  lastError?: string;
  refreshes?: number;
  failures?: number;
  consecutiveFailures?: number;
  lastRefreshAgoMs?: number;
  lastFailureAgoMs?: number;
  retryInMs?: number;
};

// Preserve bounded controller telemetry, not arbitrary fields in a public POST.
// A successful controller transaction does not certify the visible image.
export function normalizeDisplayHealth(value: unknown): DisplayHealth | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const input = value as Record<string, unknown>;
  if (input.state !== "uninitialized" && input.state !== "controller_ok" && input.state !== "retry_wait") return;
  const result: DisplayHealth = { state: input.state };
  if (typeof input.pending === "boolean") result.pending = input.pending;
  if (typeof input.lastError === "string") result.lastError = input.lastError.slice(0, 80);
  for (const key of ["refreshes", "failures", "consecutiveFailures", "lastRefreshAgoMs", "lastFailureAgoMs", "retryInMs"] as const) {
    const number = input[key];
    if (typeof number === "number" && Number.isInteger(number) && number >= 0 && number <= 0xffffffff) result[key] = number;
  }
  return result;
}

/**
 * Extracts a display-safe message from a thrown value. Supabase's
 * `PostgrestError`/`AuthError` carry a `.message` string but aren't `Error`
 * instances, so `err instanceof Error` misses them and `String(err)` prints
 * "[object Object]" — this handles both cases.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  return String(err);
}

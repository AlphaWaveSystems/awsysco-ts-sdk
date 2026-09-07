/**
 * Normalizes the platform's timestamp shapes to an ISO-8601 string. The API
 * returns plain ISO strings almost everywhere, but a handful of paths still
 * surface raw Firestore timestamp objects (`{_seconds,_nanoseconds}` from
 * the Admin SDK, or `{seconds,nanoseconds}` from some client-side reads).
 *
 * Deliberately returns a string, not a `Date` (ADR-017: the 1.x line keeps
 * timestamps as strings; a native `Date` return is reserved for 2.0).
 *
 * Unknown shapes are returned as-is rather than throwing — the SDK does not
 * validate response bodies elsewhere, and a new/changed timestamp shape
 * should degrade gracefully, not break every call that happens to touch it.
 */
export function parseTimestamp(value: unknown): string | unknown {
  if (typeof value === "string") {
    return value;
  }

  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const seconds = obj._seconds ?? obj.seconds;
    const nanoseconds = obj._nanoseconds ?? obj.nanoseconds ?? 0;
    if (typeof seconds === "number" && typeof nanoseconds === "number") {
      return new Date(seconds * 1000 + Math.floor(nanoseconds / 1_000_000)).toISOString();
    }
  }

  return value;
}

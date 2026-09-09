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
export function parseTimestamp(value: unknown): unknown {
  if (typeof value === "string") {
    return value;
  }

  // A handful of endpoints (e.g. trust-scan's `createdAt`) return a raw
  // epoch-milliseconds number instead of an ISO string or a Firestore
  // object — verified live against staging, contract fixture 1.0.11.
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
    return value;
  }

  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const seconds = obj._seconds ?? obj.seconds;
    const nanoseconds = obj._nanoseconds ?? obj.nanoseconds ?? 0;
    if (typeof seconds === "number" && typeof nanoseconds === "number") {
      const ms = seconds * 1000 + Math.floor(nanoseconds / 1_000_000);
      // `Date`'s valid range is roughly ±8.64e15ms from the epoch — a
      // corrupt/absurd `seconds` value (e.g. 1e300, or -1e14) produces an
      // Invalid Date whose `toISOString()` throws. Fall back to the raw
      // value rather than let one bad timestamp break the whole call.
      if (Number.isFinite(ms)) {
        const date = new Date(ms);
        if (!Number.isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
    }
  }

  return value;
}

/**
 * Returns a shallow copy of `obj` with each named field run through
 * {@link parseTimestamp}. Fields absent from `obj` are left untouched
 * (not added as `undefined`).
 */
export function mapTimestampFields<T extends object>(
  obj: T,
  fields: readonly (keyof T)[],
): T {
  const result: T = { ...obj };
  for (const field of fields) {
    if (field in result) {
      (result as Record<keyof T, unknown>)[field] = parseTimestamp(result[field]);
    }
  }
  return result;
}

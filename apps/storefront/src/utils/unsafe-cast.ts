/**
 * Typed escape hatch for documented casts where the underlying types are
 * known-wrong (e.g., upstream lib type bug). Every call site must include a
 * comment explaining why the cast is necessary.
 *
 * Don't use this to silence "I don't feel like fixing the types" — fix the
 * types instead.
 */
export const unsafe_cast = <T>(value: unknown): T => value as T;

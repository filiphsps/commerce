/**
 * Compares two values for deep equality using JSON serialization.
 *
 * @param a - Left-hand comparand; serialized via `JSON.stringify` before the equality check.
 * @param b - Right-hand comparand; its serialized form is compared against `a`'s.
 * @returns `true` if both values serialize to identical JSON, otherwise `false`.
 */
export function deepEqual<T>(a: T, b: T): boolean {
    try {
        return JSON.stringify(a, null, 0) === JSON.stringify(b, null, 0);
    } catch {
        return false;
    }
}

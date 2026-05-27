/**
 * Compares two values for deep equality using JSON serialization.
 *
 * @param a - First value.
 * @param b - Second value.
 * @returns `true` if both values serialize to identical JSON, otherwise `false`.
 */
export function deepEqual<T>(a: T, b: T): boolean {
    try {
        return JSON.stringify(a, null, 0) === JSON.stringify(b, null, 0);
    } catch {
        return false;
    }
}

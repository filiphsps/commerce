export function deepEqual<T>(a: T, b: T): boolean {
    try {
        return JSON.stringify(a, null, 0) === JSON.stringify(b, null, 0);
    } catch {
        return false;
    }
}

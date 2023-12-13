export function deepEqual<T>(a: T, b: T): boolean {
    return JSON.stringify(a, null, 0) === JSON.stringify(b, null, 0);
}

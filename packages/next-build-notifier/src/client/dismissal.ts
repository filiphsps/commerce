/**
 * Reads the dismissed build id from `sessionStorage`. Returns `null` on any access error
 * (private mode, disabled storage, SSR).
 *
 * @param storageKey - The storage key.
 * @returns The dismissed build id, or `null`.
 */
export function readDismissed(storageKey: string): string | null {
    try {
        return globalThis.sessionStorage?.getItem(storageKey) ?? null;
    } catch {
        return null;
    }
}

/**
 * Persists the dismissed build id to `sessionStorage`, swallowing access errors.
 *
 * @param storageKey - The storage key.
 * @param buildId - The build id being dismissed.
 */
export function writeDismissed(storageKey: string, buildId: string): void {
    try {
        globalThis.sessionStorage?.setItem(storageKey, buildId);
    } catch {
        /* storage unavailable — dismissal is best-effort */
    }
}

/**
 * Hard-reloads the document to fetch the new deployment's assets. SSR-safe no-op when `window` is
 * unavailable.
 */
export function reload(): void {
    if (typeof window !== 'undefined') {
        window.location.reload();
    }
}

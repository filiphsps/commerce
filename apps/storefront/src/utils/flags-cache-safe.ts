/**
 * Read a feature flag value from edge config, falling back to the supplied
 * default when edge config isn't configured (local dev, no EDGE_CONFIG env)
 * or the key isn't set.
 *
 * Use this instead of `flags/next` inside `'use cache'` scopes.
 * The flags wrapper reads request headers internally for visit attribution,
 * which Next 16 forbids inside cached components.
 *
 * Defensive against (a) missing EDGE_CONFIG env, (b) module-init failures in
 * `@vercel/edge-config`, (c) per-call errors. Uses a dynamic import so the
 * package is never resolved when there's no connection string to use.
 *
 * @param key - Edge config key to read.
 * @param defaultValue - Returned when edge config is unavailable or the key is unset.
 */
export async function readFlag<T>(key: string, defaultValue: T): Promise<T> {
    if (!process.env.EDGE_CONFIG) return defaultValue;

    try {
        const { get } = await import('@vercel/edge-config');
        if (typeof get !== 'function') return defaultValue;
        const value = await get<T>(key);
        return value ?? defaultValue;
    } catch {
        return defaultValue;
    }
}

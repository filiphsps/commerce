import { get } from '@vercel/edge-config';

/**
 * Read a feature flag value from edge config, falling back to the supplied
 * default when edge config isn't configured (local dev, no EDGE_CONFIG env)
 * or the key isn't set.
 *
 * Use this instead of `@vercel/flags/next` inside `'use cache'` scopes.
 * The flags wrapper reads request headers internally for visit attribution,
 * which Next 16 forbids inside cached components.
 *
 * @param key - Edge config key to read.
 * @param defaultValue - Returned when edge config is unavailable or the key is unset.
 */
export async function readFlag<T>(key: string, defaultValue: T): Promise<T> {
    try {
        const value = await get<T>(key);
        return value ?? defaultValue;
    } catch {
        // EDGE_CONFIG env var not set, or transient edge config error.
        return defaultValue;
    }
}

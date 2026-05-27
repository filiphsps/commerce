import type { Cart } from './types';

export interface IdempotencyStore {
    get(key: string): Promise<{ result: Cart; recordedAt: number } | null>;
    set(key: string, result: Cart, ttlMs: number): Promise<void>;
}

/**
 * In-memory {@link IdempotencyStore} backed by a `Map`. Suitable for tests,
 * single-process dev servers, and as a reference implementation. Entries
 * lazily expire on read; there is no background sweep.
 *
 * @returns An ephemeral store with no cross-process coordination.
 */
export function memoryIdempotencyStore(): IdempotencyStore {
    const map = new Map<string, { result: Cart; recordedAt: number; expiresAt: number }>();
    return {
        async get(key) {
            const entry = map.get(key);
            if (!entry) return null;
            if (Date.now() >= entry.expiresAt) {
                map.delete(key);
                return null;
            }
            return { result: entry.result, recordedAt: entry.recordedAt };
        },
        async set(key, result, ttlMs) {
            map.set(key, { result, recordedAt: Date.now(), expiresAt: Date.now() + ttlMs });
        },
    };
}

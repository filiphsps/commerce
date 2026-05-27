import type { CartMiddleware } from '../compose';
import type { IdempotencyStore } from '../idempotency-store';

/**
 * Built-in middleware that deduplicates mutations sharing the same
 * `ctx.idempotencyKey` within `windowMs`. Replays return the cached cart
 * without invoking the inner chain. Mutations without a key pass through
 * unaltered.
 *
 * @param opts.store - Backing {@link IdempotencyStore} (memory, Redis, etc).
 * @param opts.windowMs - TTL applied when caching a successful result.
 * @returns A {@link CartMiddleware} that short-circuits duplicates.
 */
export function idempotency(opts: { store: IdempotencyStore; windowMs: number }): CartMiddleware {
    return (next) => async (mutation, ctx) => {
        const key = ctx.idempotencyKey;
        if (!key) return next(mutation, ctx);
        const existing = await opts.store.get(key);
        if (existing) return existing.result;
        const result = await next(mutation, ctx);
        await opts.store.set(key, result, opts.windowMs);
        return result;
    };
}

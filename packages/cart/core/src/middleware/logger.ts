import type { CartMiddleware } from '../compose';

/**
 * Built-in middleware that logs mutation lifecycle events via `ctx.logger`.
 * Emits `cart.mutation.start` before delegation, `cart.mutation.end` on
 * resolve, and `cart.mutation.error` (at warn level) on reject before
 * rethrowing.
 *
 * @returns A {@link CartMiddleware} that observes — never alters — the chain.
 * @example
 * ```ts
 * const kernel = createCart({
 *   adapter,
 *   middleware: [logger()],
 * });
 * ```
 */
export function logger(): CartMiddleware {
    return (next) => async (mutation, ctx) => {
        ctx.logger.info('cart.mutation.start', { kind: mutation.kind });
        try {
            const result = await next(mutation, ctx);
            ctx.logger.info('cart.mutation.end', { kind: mutation.kind, cartId: result.id });
            return result;
        } catch (error) {
            ctx.logger.warn('cart.mutation.error', { kind: mutation.kind, error: (error as Error)?.message });
            throw error;
        }
    };
}

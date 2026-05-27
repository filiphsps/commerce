import type { CartMiddleware } from '../compose';

export type AnalyticsEmit = (event: string, attrs: Record<string, unknown>) => void;

/**
 * Built-in middleware that calls the host-supplied `emit` on every mutation:
 * `cart.mutation.success` on resolve and `cart.mutation.error` on reject.
 * The emit call is fire-and-forget — a thrown emit handler will surface
 * because emit is invoked synchronously inside the async chain.
 *
 * @param opts.emit - Host analytics sink. Receives event name + attribute bag.
 * @returns A {@link CartMiddleware} that observes mutation outcomes.
 */
export function analytics(opts: { emit: AnalyticsEmit }): CartMiddleware {
    return (next) => async (mutation, ctx) => {
        try {
            const result = await next(mutation, ctx);
            opts.emit('cart.mutation.success', {
                kind: mutation.kind,
                cartId: result.id,
                ...(ctx.idempotencyKey ? { idempotencyKey: ctx.idempotencyKey } : {}),
            });
            return result;
        } catch (error) {
            opts.emit('cart.mutation.error', {
                kind: mutation.kind,
                errorName: (error as Error)?.name ?? 'Error',
                errorMessage: (error as Error)?.message,
            });
            throw error;
        }
    };
}

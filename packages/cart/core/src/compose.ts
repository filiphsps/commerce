import type { AdapterCtx, Cart, CartMutation } from './types';

/**
 * Core mutation primitive: an async function that accepts a {@link CartMutation}
 * and its dispatch context, and returns the resulting cart snapshot.
 *
 * @example
 * ```ts
 * const terminal: MutationFn = async (mutation, ctx) =>
 *   adapter.addLines(ctx, { cartId: ctx.cartId ?? '', lines: [] });
 * ```
 */
export type MutationFn = (mutation: CartMutation, ctx: AdapterCtx) => Promise<Cart>;

/**
 * Higher-order function that wraps a {@link MutationFn} to inject cross-cutting
 * behavior (logging, retrying, tracing). Middleware layers compose into a single
 * pipeline via {@link compose}.
 *
 * @example
 * ```ts
 * const timestamp: CartMiddleware = (next) => async (mutation, ctx) => {
 *   console.time(mutation.kind);
 *   const result = await next(mutation, ctx);
 *   console.timeEnd(mutation.kind);
 *   return result;
 * };
 * ```
 */
export type CartMiddleware = (next: MutationFn) => MutationFn;

/**
 * Koa-style middleware composer: each layer wraps the next in registration
 * order. With `compose(a, b)(terminal)`, execution flows `a → b → terminal`
 * and unwinds in reverse.
 *
 * @param middleware - Layers from outermost to innermost.
 * @returns A higher-order function that wraps a terminal {@link MutationFn}
 *   into a single composed {@link MutationFn}.
 * @example
 * ```ts
 * const pipeline = compose(logger(), retry({ attempts: 3, backoffMs: 100 }));
 * const run = pipeline(terminal);
 * await run({ kind: 'add-line', variantId: 'v_123', quantity: 1 }, ctx);
 * ```
 */
export function compose(...middleware: CartMiddleware[]): CartMiddleware {
    return (terminal: MutationFn): MutationFn => {
        return middleware.reduceRight<MutationFn>((next, mw) => mw(next), terminal);
    };
}

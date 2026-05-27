import type { AdapterCtx, Cart, CartMutation } from './types';

export type MutationFn = (mutation: CartMutation, ctx: AdapterCtx) => Promise<Cart>;
export type CartMiddleware = (next: MutationFn) => MutationFn;

/**
 * Koa-style middleware composer: each layer wraps the next in registration
 * order. With `compose(a, b)(terminal)`, execution flows `a → b → terminal`
 * and unwinds in reverse.
 *
 * @param middleware - Layers from outermost to innermost.
 * @returns A higher-order function that wraps a terminal {@link MutationFn}
 *   into a single composed {@link MutationFn}.
 */
export function compose(...middleware: CartMiddleware[]): CartMiddleware {
    return (terminal: MutationFn): MutationFn => {
        return middleware.reduceRight<MutationFn>((next, mw) => mw(next), terminal);
    };
}

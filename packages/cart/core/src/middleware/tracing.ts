import type { CartMiddleware } from '../compose';
import type { ITracer } from '../types';

/**
 * Built-in middleware that wraps each mutation in an OTel-shaped span.
 * Span name is `cart.mutation.<kind>`; attributes include the mutation kind
 * and (when present) idempotency key. The resolved cart id is added after
 * the inner call resolves; exceptions are recorded and rethrown.
 *
 * @param opts - Optional explicit tracer. If omitted, `ctx.tracer` is used;
 *   if both are absent the middleware degrades to a pass-through.
 * @returns A {@link CartMiddleware} that pipes mutations through a span.
 * @example
 * ```ts
 * const kernel = createCart({
 *   adapter,
 *   middleware: [tracing({ tracer: openTelemetryTracer })],
 * });
 * ```
 */
export function tracing(opts: { tracer?: ITracer }): CartMiddleware {
    return (next) => async (mutation, ctx) => {
        const tracer = opts.tracer ?? ctx.tracer;
        if (!tracer) return next(mutation, ctx);
        return tracer.startSpan(
            `cart.mutation.${mutation.kind}`,
            {
                'mutation.kind': mutation.kind,
                ...(ctx.idempotencyKey ? { 'idempotency.key': ctx.idempotencyKey } : {}),
            },
            async (span) => {
                try {
                    const result = await next(mutation, ctx);
                    span.setAttribute('cart.id', result.id);
                    return result;
                } catch (error) {
                    span.recordException(error);
                    throw error;
                }
            },
        );
    };
}

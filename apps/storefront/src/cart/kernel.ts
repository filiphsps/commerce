import 'server-only';

import { analytics, createCart, idempotency, logger, memoryIdempotencyStore, retry, tracing } from '@nordcom/cart-core';
import {
    createCartEnsurer,
    createCartReader,
    createFormCartActions,
    createTypedCartActions,
    httpOnlyCookieStorage,
    nextEventBridge,
} from '@nordcom/cart-next';
import { createShopifyCartAdapter } from '@nordcom/cart-shopify';
import type { OnlineShop } from '@nordcom/commerce-db';
import { trace } from '@opentelemetry/api';

import { emitAnalytics } from './analytics';
import { authBridge } from './auth-bridge';
import { resolveContext } from './context';
import { messageLocalizer } from './localize';
import { shopifyTransport } from './transport';

const adapter = createShopifyCartAdapter({ transport: shopifyTransport });

const otelTracer = {
    /**
     * Bridge cart-core's tracer contract onto OpenTelemetry's
     * `startActiveSpan` so the kernel's tracing middleware drops spans on
     * the same OTel tracer the storefront already uses.
     *
     * @param name - Span name.
     * @param attrs - Initial attribute bag, passed through to OTel.
     * @param fn - Async callback that receives a minimal span surface.
     * @returns Whatever `fn` resolves with.
     */
    async startSpan<R>(
        name: string,
        attrs: Record<string, unknown>,
        fn: (span: {
            recordException: (e: unknown) => void;
            setAttribute: (k: string, v: unknown) => void;
        }) => Promise<R>,
    ): Promise<R> {
        return trace
            .getTracer('cart')
            .startActiveSpan(name, { attributes: attrs as Record<string, never> }, async (span) => {
                try {
                    return await fn({
                        recordException: (e) => span.recordException(e as Error),
                        setAttribute: (k, v) => span.setAttribute(k, v as never),
                    });
                } finally {
                    span.end();
                }
            });
    },
};

export const cartKernel = createCart<{}, OnlineShop>({
    adapter,
    middleware: [
        logger(),
        tracing({ tracer: otelTracer }),
        idempotency({ store: memoryIdempotencyStore(), windowMs: 30_000 }),
        retry({ attempts: 2, backoffMs: 50 }),
        analytics({ emit: emitAnalytics }),
    ],
});

export type AppCartCaps = typeof cartKernel.capabilities;
export type AppCartExt = Record<string, never>;
export type AppCartConfig = { caps: AppCartCaps; ext: AppCartExt };

const storage = httpOnlyCookieStorage();
export const readCart = createCartReader({ kernel: cartKernel, storage });
export const ensureCart = createCartEnsurer({ kernel: cartKernel, storage, reader: readCart });
export const typed = createTypedCartActions({
    kernel: cartKernel,
    storage,
    resolveContext,
    authBridge,
    messageLocalizer,
});
export const forms = createFormCartActions({ typed });

nextEventBridge().onKernel(cartKernel);

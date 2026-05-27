import 'server-only';

import type { AnalyticsEmit } from '@nordcom/cart-core';
import { trace } from '@opentelemetry/api';

/**
 * Pipe cart-core analytics events into the active OpenTelemetry span so cart
 * mutations show up alongside the existing storefront request trace. Mirrors
 * the pre-extraction behavior where `_actions/cart.ts` emitted OTel events
 * directly. Extend with a product-analytics SDK once one is wired into the
 * storefront.
 *
 * @param event - Analytics event name emitted by cart-core's middleware.
 * @param attrs - Attribute bag forwarded as OTel span attributes.
 */
export const emitAnalytics: AnalyticsEmit = (event, attrs) => {
    trace.getActiveSpan()?.addEvent(event, attrs as Record<string, never>);
};

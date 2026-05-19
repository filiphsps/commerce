import 'server-only';

import { getPayloadInstance } from '@nordcom/commerce-cms/api';
import { FeatureFlag, Review, Shop } from '@nordcom/commerce-db';

let bootPromise: Promise<void> | null = null;

/**
 * Inject the booted Payload instance into the `@nordcom/commerce-db` service
 * singletons (`Shop`, `Review`, `FeatureFlag`).
 *
 * Must be `await`ed at every server entry point (middleware, layout, route
 * handler) that calls a service method. Idempotent and cached per module graph
 * — first call boots Payload via `getPayloadInstance()` (no-admin config),
 * subsequent calls return the cached promise instantly.
 *
 * Turbopack compiles `instrumentation.ts`, middleware, and the app server into
 * separate module graphs; each graph needs its own boot.
 */
export function bootServices(): Promise<void> {
    if (!bootPromise) {
        bootPromise = (async () => {
            const payload = await getPayloadInstance();
            Shop.setPayload(payload);
            Review.setPayload(payload);
            FeatureFlag.setPayload(payload);
        })();
    }
    return bootPromise;
}

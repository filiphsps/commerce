import 'server-only';

import { FeatureFlag, Review, Shop } from '@nordcom/commerce-db';
import { getPayload } from 'payload';

import payloadConfig from '@/payload.config';

let bootPromise: Promise<void> | null = null;

/**
 * Inject the booted Payload instance into the `@nordcom/commerce-db` service
 * singletons (`Shop`, `Review`, `FeatureFlag`).
 *
 * Must be `await`ed at every server entry point before any service method runs.
 * Idempotent and cached per module graph — first call boots Payload, subsequent
 * calls return the cached promise instantly. `getPayload({ config })` is itself
 * cached internally by Payload, so re-entry across requests is cheap.
 *
 * Turbopack compiles `instrumentation.ts`, middleware, and the app server into
 * separate module graphs; each graph has its own `Shop` singleton, so each
 * graph must `await bootServices()` once before service use.
 */
export function bootServices(): Promise<void> {
    if (!bootPromise) {
        bootPromise = (async () => {
            const payload = await getPayload({ config: payloadConfig });
            Shop.setPayload(payload);
            Review.setPayload(payload);
            FeatureFlag.setPayload(payload);
        })();
    }
    return bootPromise;
}

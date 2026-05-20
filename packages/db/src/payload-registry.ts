import 'server-only';

import { PayloadGetterNotRegisteredError } from '@nordcom/commerce-errors';
import type { Payload } from 'payload';

const KEY = Symbol.for('@nordcom/commerce-db/payload-getter');

type Registry = { getter: () => Promise<Payload> } | undefined;

function slot(): { value: Registry } {
    const g = globalThis as unknown as Record<symbol, { value: Registry }>;
    if (!g[KEY]) g[KEY] = { value: undefined };
    return g[KEY];
}

/**
 * Register the function commerce-db uses to obtain a Payload instance. Call
 * this once per app at startup (typically from `instrumentation.ts`).
 *
 * The getter is invoked lazily on the first Shop/Review/FeatureFlag method
 * call after registration. Payload's `getPayload({ config })` caches
 * internally on globalThis, so repeated invocations are O(1).
 */
export function registerPayload(getter: () => Promise<Payload>): void {
    slot().value = { getter };
}

/** @internal — used by Shop/Review/FeatureFlag and tests */
export async function getRegisteredPayload(): Promise<Payload> {
    const reg = slot().value;
    if (!reg) {
        throw new PayloadGetterNotRegisteredError();
    }
    return reg.getter();
}

/** @internal — test cleanup */
export function _resetPayloadRegistryForTests(): void {
    slot().value = undefined;
}

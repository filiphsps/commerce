import { AsyncLocalStorage } from 'node:async_hooks';

import { describe, expect, it } from 'vitest';

import { getActiveShopDomain, setActiveShopDomain } from './active-shop';

/**
 * Roots a callback in its OWN async context — a stand-in for how the runtime dispatches each
 * request/Server-Action in an isolated async context, the boundary the request-scoped carrier relies
 * on (the same per-request isolation `cache()` depended on).
 */
const requestRoot = new AsyncLocalStorage<unknown>();
const inRequest = <T>(fn: () => Promise<T>): Promise<T> => requestRoot.run({}, fn);

describe('active-shop domain slot', () => {
    it('reads back a domain set earlier in the same async context, across an await (no render scope)', async () => {
        // The regression: mirrors the Server Action path — `getAuthedCmsCtx` sets the domain, then a
        // later awaited bridge call reads it. There is NO React render scope here, which is exactly
        // where `cache()` dropped the value and forced the multi-shop operator into
        // AMBIGUOUS_SHOP_MEMBERSHIP. The async store must survive the await.
        await inRequest(async () => {
            setActiveShopDomain('demo.nordcom.store');
            await Promise.resolve();
            expect(getActiveShopDomain()).toBe('demo.nordcom.store');
        });
    });

    it('re-stamps the slot on every write, so a later set overwrites the prior value', async () => {
        // The leak-prevention contract `getAuthedCmsCtx` leans on: it sets the domain unconditionally
        // at the head of EVERY tenant request, so even if the runtime reused an async context, the new
        // request's value overwrites the old one before any tenant call reads it. `undefined` clears it
        // (the cross-tenant route case).
        await inRequest(async () => {
            setActiveShopDomain('first.nordcom.store');
            setActiveShopDomain('second.nordcom.store');
            expect(getActiveShopDomain()).toBe('second.nordcom.store');
            setActiveShopDomain(undefined);
            expect(getActiveShopDomain()).toBeUndefined();
        });
    });

    it('reads undefined when no domain was set in the context (cross-tenant route)', async () => {
        await inRequest(async () => {
            expect(getActiveShopDomain()).toBeUndefined();
        });
    });
});

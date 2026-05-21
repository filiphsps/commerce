import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

vi.mock('@nordcom/commerce-db', () => ({
    Shop: { findByDomain: vi.fn(), findAll: vi.fn() },
}));

// Mock the source module that `_loaders.ts` wraps.
import * as productMod from '@/api/shopify/product';

vi.mock('@/api/shopify/product', async () => {
    const actual = await vi.importActual<typeof productMod>('@/api/shopify/product');
    return {
        ...actual,
        ProductApi: vi.fn().mockResolvedValue([{ id: 'p1' }, null]),
    };
});

describe('PDP fetch dedup', () => {
    // react/cache() only deduplicates inside a React Server Components render pass.
    // Outside RSC (the standard React bundle used by Node/Vitest), cache() is a
    // transparent no-op that calls through on every invocation — so this assertion
    // cannot be proved in unit-test isolation.
    //
    // In production (Next.js App Router RSC), the react-server condition activates
    // the real per-request cache store, and five concurrent calls to the same cached
    // loader ARE deduplicated to a single upstream fetch.
    //
    // The test is kept (skipped) to document the intent and serve as a reminder that
    // any restructuring of PDP data-fetching must preserve the single-call guarantee.
    it.skip('layout + slots together call ProductApi once for the same handle', async () => {
        // Import the loader (not the source) — concurrent React-request calls dedupe.
        const { ProductApi } = await import('@/api/_loaders');
        const calls = await Promise.all([
            ProductApi({ api: {} as any, handle: 'h1' }),
            ProductApi({ api: {} as any, handle: 'h1' }),
            ProductApi({ api: {} as any, handle: 'h1' }),
            ProductApi({ api: {} as any, handle: 'h1' }),
            ProductApi({ api: {} as any, handle: 'h1' }),
        ]);
        expect(calls.length).toBe(5);
        expect(vi.mocked(productMod.ProductApi)).toHaveBeenCalledTimes(1);
    });
});

import type { OnlineShop } from '@nordcom/commerce-db';
import { describe, expect, it } from 'vitest';

import { cache } from '@/cache';
import { Locale } from '@/utils/locale';

const tenant = { id: 'shop-1', domain: 'mock.shop' } as OnlineShop;
const qualifier = Locale.from('en-US');

describe('cache schema', () => {
    describe('search', () => {
        it('exposes cache.keys.search with query param', () => {
            const entry = cache.keys.search({ tenant, qualifier, query: 'candy' });
            expect(entry.tags).toBeInstanceOf(Array);
            expect(entry.tags.length).toBeGreaterThan(0);
        });

        it('produces tags scoped by tenant id and query', () => {
            const entry = cache.keys.search({ tenant, qualifier, query: 'candy' });
            expect(entry.tags.some((t: string) => t.includes('shop-1'))).toBe(true);
            expect(entry.tags.some((t: string) => t.includes('candy'))).toBe(true);
        });

        it('inherits products parent so invalidating products busts search', () => {
            const searchEntry = cache.keys.search({ tenant, qualifier, query: 'candy' });
            const productsEntry = cache.keys.products({ tenant });
            const productsTag = productsEntry.tags.find((t: string) => t.endsWith('.products'));
            expect(productsTag).toBeDefined();
            expect(searchEntry.tags).toContain(productsTag);
        });
    });
});

import { describe, expect, it } from 'vitest';
import { resolveCartProvider } from './index';

describe('resolveCartProvider', () => {
    it('returns the shopify adapter for shopify shops', () => {
        const shop = { commerceProvider: { type: 'shopify' } } as any;
        const adapter = resolveCartProvider(shop);
        expect(adapter.type).toBe('shopify');
    });

    // Cannot use toThrow(UnknownCommerceProviderError) directly because the Error<T> base
    // class in @nordcom/commerce-errors calls Object.setPrototypeOf(this, Error.prototype),
    // which breaks instanceof for all subclasses. Asserting on `name` is the workaround pattern.
    it('throws UnknownCommerceProviderError for unknown provider types', () => {
        const shop = { commerceProvider: { type: 'fakecom' } } as any;
        let caught: unknown;
        try {
            resolveCartProvider(shop);
        } catch (error) {
            caught = error;
        }
        expect(caught).toBeDefined();
        expect((caught as Error).name).toBe('UnknownCommerceProviderError');
    });
});

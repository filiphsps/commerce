import { describe, expect, it } from 'vitest';
import {
    CartCapabilityUnsupportedError,
    CartError,
    CartNotFoundError,
    CartProviderError,
    CartUserError,
} from '../src/errors';

describe('cart errors', () => {
    it('CartNotFoundError carries name + cartId', () => {
        const e = new CartNotFoundError('gid://Cart/abc');
        expect(e.name).toBe('CartNotFoundError');
        expect(e.message).toContain('gid://Cart/abc');
        expect(e instanceof CartError).toBe(true);
    });

    it('CartUserError carries userErrors array', () => {
        const e = new CartUserError([{ field: 'lineId', message: 'invalid line' }]);
        expect(e.name).toBe('CartUserError');
        expect(e.userErrors[0]?.message).toBe('invalid line');
    });

    it('CartProviderError preserves cause', () => {
        const cause = new Error('transport down');
        const e = new CartProviderError('Shopify failed', cause);
        expect(e.name).toBe('CartProviderError');
        expect(e.cause).toBe(cause);
    });

    it('CartCapabilityUnsupportedError names the missing capability', () => {
        const e = new CartCapabilityUnsupportedError('giftCards');
        expect(e.name).toBe('CartCapabilityUnsupportedError');
        expect(e.capability).toBe('giftCards');
    });
});

import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyShopifyHmac } from '../src/hmac';

const sign = (body: string, secret: string) => createHmac('sha256', secret).update(body, 'utf8').digest('base64');

describe('verifyShopifyHmac', () => {
    it('returns true for a valid signature', () => {
        const body = '{"hello":"world"}';
        const secret = 's3cret';
        const hmac = sign(body, secret);
        expect(verifyShopifyHmac(body, hmac, secret)).toBe(true);
    });

    it('returns false for a wrong signature', () => {
        expect(verifyShopifyHmac('body', 'not-the-real-hmac', 'secret')).toBe(false);
    });

    it('returns false when header is null', () => {
        expect(verifyShopifyHmac('body', null, 'secret')).toBe(false);
    });

    it('returns false on wildly mismatched lengths without throwing', () => {
        expect(verifyShopifyHmac('body', 'short', 'secret')).toBe(false);
    });
});

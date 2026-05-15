import { describe, expect, it } from 'vitest';
import { encodeSegment, joinSegments } from '../src/encode';

describe('encodeSegment', () => {
    it('passes alphanumerics through unchanged', () => {
        expect(encodeSegment('hello-world_123')).toBe('hello-world_123');
    });

    it('percent-encodes "." (the segment separator)', () => {
        expect(encodeSegment('foo.bar')).toBe('foo%2Ebar');
    });

    it('percent-encodes ":" (the qualifier separator)', () => {
        expect(encodeSegment('a:b')).toBe('a%3Ab');
    });

    it('percent-encodes spaces', () => {
        expect(encodeSegment('hello world')).toBe('hello%20world');
    });

    it('percent-encodes "/"', () => {
        expect(encodeSegment('a/b')).toBe('a%2Fb');
    });

    it('passes emoji through encodeURIComponent', () => {
        expect(encodeSegment('🌮')).toBe(encodeURIComponent('🌮'));
    });

    it('coerces numbers to their string form before encoding', () => {
        expect(encodeSegment(42)).toBe('42');
    });
});

describe('joinSegments', () => {
    it('joins with "."', () => {
        expect(joinSegments(['shopify', 'shop_1', 'product', 'cool-shirt'])).toBe('shopify.shop_1.product.cool-shirt');
    });

    it('encodes each segment before joining', () => {
        expect(joinSegments(['shopify', 'shop.1', 'product', 'cool-shirt'])).toBe(
            'shopify.shop%2E1.product.cool-shirt',
        );
    });

    it('treats falsy/empty intermediate segments as a hard error', () => {
        expect(() => joinSegments(['shopify', '', 'product'])).toThrow(/empty segment/);
    });
});

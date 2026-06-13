import { ConvexError } from 'convex/values';
import { describe, expect, it } from 'vitest';

import { ChecksumErrorCode, canonicalJson, checksumDocument, rollupChecksum, sha256Hex } from './checksum';

describe('canonicalJson', () => {
    it('sorts object keys at every depth and preserves array order', () => {
        const a = { z: [1, 2], nested: { b: 2, a: 1 } };
        const b = { nested: { a: 1, b: 2 }, z: [1, 2] };
        expect(canonicalJson(a)).toBe(canonicalJson(b));
        expect(canonicalJson([1, 2])).not.toBe(canonicalJson([2, 1]));
    });

    it('drops undefined object entries but renders undefined array holes as null', () => {
        expect(canonicalJson({ a: 1, gone: undefined })).toBe('{"a":1}');
        expect(canonicalJson([undefined])).toBe('[null]');
    });

    it('normalizes -0 and keeps non-finite tokens distinct from null', () => {
        expect(canonicalJson(-0)).toBe('0');
        expect(canonicalJson(Number.NaN)).toBe('NaN');
        expect(canonicalJson(Number.POSITIVE_INFINITY)).not.toBe(canonicalJson(null));
    });

    it('rejects uncanonicalizable values with the stable error code', () => {
        try {
            canonicalJson({ fn: () => 1 });
            throw new TypeError('expected canonicalJson to throw');
        } catch (error: unknown) {
            expect(error).toBeInstanceOf(ConvexError);
            expect((error as ConvexError<{ code: string }>).data.code).toBe(ChecksumErrorCode.UNSUPPORTED_VALUE);
        }
    });
});

describe('sha256Hex / checksumDocument / rollupChecksum', () => {
    it('matches the published SHA-256 vector for "abc"', async () => {
        await expect(sha256Hex('abc')).resolves.toBe(
            'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
        );
    });

    it('checksumDocument is key-order invariant', async () => {
        await expect(checksumDocument({ a: 1, b: 'x' })).resolves.toBe(await checksumDocument({ b: 'x', a: 1 }));
    });

    it('rollup is order-invariant, count-sensitive, and fixed for the empty collection', async () => {
        const one = await sha256Hex('one');
        const two = await sha256Hex('two');
        await expect(rollupChecksum([one, two])).resolves.toBe(await rollupChecksum([two, one]));
        await expect(rollupChecksum([one])).resolves.not.toBe(await rollupChecksum([one, one]));
        await expect(rollupChecksum([])).resolves.toBe(await sha256Hex(''));
    });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveDns } from './dns';

afterEach(() => vi.restoreAllMocks());

/**
 * Stubs `fetch` with one Google DoH JSON payload.
 *
 * @param payload - The JSON body to resolve.
 * @param ok - Whether the response is 2xx.
 */
function mockDoh(payload: unknown, ok = true): void {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok,
        status: ok ? 200 : 502,
        json: async () => payload,
    } as Response);
}

describe('resolveDns', () => {
    it('returns normalized CNAME targets (lowercased, trailing dot stripped)', async () => {
        mockDoh({ Answer: [{ name: 'shop.acme.com.', type: 5, data: 'CNAME.Vercel-DNS.com.' }] });
        expect(await resolveDns('shop.acme.com', 'CNAME')).toEqual(['cname.vercel-dns.com']);
    });

    it('returns A records and ignores non-matching record types', async () => {
        mockDoh({
            Answer: [
                { name: 'acme.com.', type: 5, data: 'other.example.com.' },
                { name: 'acme.com.', type: 1, data: '76.76.21.21' },
            ],
        });
        expect(await resolveDns('acme.com', 'A')).toEqual(['76.76.21.21']);
    });

    it('returns [] when there is no answer (NXDOMAIN)', async () => {
        mockDoh({ Status: 3 });
        expect(await resolveDns('nope.acme.com', 'A')).toEqual([]);
    });

    it('throws on a transport failure (non-200)', async () => {
        mockDoh({}, false);
        await expect(resolveDns('shop.acme.com', 'A')).rejects.toThrow();
    });
});

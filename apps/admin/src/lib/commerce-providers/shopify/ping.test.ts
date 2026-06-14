import { afterEach, describe, expect, it, vi } from 'vitest';

import { pingShopifyStorefront } from './ping';

const okResponse = (body: unknown): Response => ({ ok: true, status: 200, json: async () => body }) as Response;
const httpError = (status: number): Response => ({ ok: false, status, json: async () => ({}) }) as Response;

afterEach(() => {
    vi.restoreAllMocks();
});

describe('pingShopifyStorefront', () => {
    it('returns ok + shopName when the Storefront API answers', async () => {
        const fetchSpy = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValue(okResponse({ data: { shop: { name: 'Acme' } } }));

        const result = await pingShopifyStorefront({ storeDomain: 'acme.myshopify.com', publicToken: 'tok' });

        expect(result).toEqual({ ok: true, shopName: 'Acme' });
        const [url, init] = fetchSpy.mock.calls[0]!;
        expect(url).toBe('https://acme.myshopify.com/api/2025-10/graphql.json');
        expect((init!.headers as Record<string, string>)['X-Shopify-Storefront-Access-Token']).toBe('tok');
    });

    it('reports GraphQL errors', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(okResponse({ errors: [{ message: 'bad token' }] }));
        const result = await pingShopifyStorefront({ storeDomain: 'acme.myshopify.com', publicToken: 'x' });
        expect(result).toEqual({ ok: false, error: 'bad token' });
    });

    it('reports an HTTP failure', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(httpError(401));
        const result = await pingShopifyStorefront({ storeDomain: 'acme.myshopify.com', publicToken: 'x' });
        expect(result).toEqual({ ok: false, error: 'Shopify Storefront API returned HTTP 401.' });
    });

    it('rejects empty inputs without calling fetch', async () => {
        const fetchSpy = vi.spyOn(globalThis, 'fetch');
        const result = await pingShopifyStorefront({ storeDomain: '', publicToken: '' });
        expect(result.ok).toBe(false);
        expect(fetchSpy).not.toHaveBeenCalled();
    });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/headers', () => ({
    headers: vi.fn(),
}));

vi.mock('@nordcom/commerce-db', () => ({
    Shop: {
        findByDomain: vi.fn(),
    },
}));

const { headers } = await import('next/headers');
const { Shop } = await import('@nordcom/commerce-db');
const { getRequestContext } = await import('@/utils/request-context');

describe('utils/request-context', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('getRequestContext', () => {
        it('returns null when x-shop-domain header is missing', async () => {
            (headers as any).mockResolvedValue(new Headers({ 'x-locale': 'en-US' }));
            const ctx = await getRequestContext();
            expect(ctx).toBeNull();
        });

        it('returns null when x-locale header is missing', async () => {
            (headers as any).mockResolvedValue(new Headers({ 'x-shop-domain': 'mock.shop' }));
            const ctx = await getRequestContext();
            expect(ctx).toBeNull();
        });

        it('returns null when Shop.findByDomain throws', async () => {
            (headers as any).mockResolvedValue(new Headers({ 'x-shop-domain': 'mock.shop', 'x-locale': 'en-US' }));
            (Shop.findByDomain as any).mockRejectedValue(new Error('not found'));
            const ctx = await getRequestContext();
            expect(ctx).toBeNull();
        });

        it('returns {shop, locale} when headers and shop lookup succeed', async () => {
            (headers as any).mockResolvedValue(new Headers({ 'x-shop-domain': 'mock.shop', 'x-locale': 'en-US' }));
            (Shop.findByDomain as any).mockResolvedValue({ id: 'shop-1', domain: 'mock.shop' });
            const ctx = await getRequestContext();
            expect(ctx?.shop.id).toBe('shop-1');
            expect(ctx?.locale.code).toBe('en-US');
        });

        it('populates featureFlags.flag on the shop fetch', async () => {
            (headers as any).mockResolvedValue(new Headers({ 'x-shop-domain': 'mock.shop', 'x-locale': 'en-US' }));
            (Shop.findByDomain as any).mockResolvedValue({ id: 'shop-1', domain: 'mock.shop', featureFlags: [] });
            await getRequestContext();
            expect(Shop.findByDomain).toHaveBeenCalledWith(
                'mock.shop',
                expect.objectContaining({ populate: ['featureFlags.flag'] }),
            );
        });
    });
});

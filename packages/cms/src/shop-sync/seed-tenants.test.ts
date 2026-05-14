import { describe, expect, it, vi } from 'vitest';
import { seedTenantsForExistingShops } from './seed-tenants';

describe('seedTenantsForExistingShops', () => {
    it('upserts a tenant for every shop the finder returns', async () => {
        const find = vi.fn(async () => ({ docs: [] }));
        const create = vi.fn(async () => ({ id: 't1' }));
        const update = vi.fn(async () => ({ id: 't1' }));
        const payload = { find, create, update } as never;
        const result = await seedTenantsForExistingShops({
            payload,
            findShops: async () => [
                { id: 'shop_a', name: 'A', domain: 'a.com', i18n: { defaultLocale: 'en-US' } },
                { id: 'shop_b', name: 'B', domain: 'b.com', i18n: { defaultLocale: 'sv', locales: ['sv', 'en-US'] } },
            ],
        });
        expect(result).toEqual({ synced: 2, failed: 0 });
        expect(create).toHaveBeenCalledTimes(2);
        // Verify the locale-fallback shape: shop without an explicit locales
        // list defaults to [defaultLocale] so the required+hasMany Payload
        // field validates.
        expect(create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ shopId: 'shop_a', locales: ['en-US'] }),
            }),
        );
        expect(create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ shopId: 'shop_b', locales: ['sv', 'en-US'] }),
            }),
        );
    });

    it('continues syncing later shops when one fails', async () => {
        const find = vi.fn(async () => ({ docs: [] }));
        const create = vi
            .fn()
            .mockRejectedValueOnce(new Error('boom'))
            .mockResolvedValueOnce({ id: 't2' });
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const payload = { find, create, update: vi.fn() } as never;
        const result = await seedTenantsForExistingShops({
            payload,
            findShops: async () => [
                { id: 'shop_a', name: 'A', domain: 'a.com', i18n: { defaultLocale: 'en-US' } },
                { id: 'shop_b', name: 'B', domain: 'b.com', i18n: { defaultLocale: 'en-US' } },
            ],
        });
        expect(result).toEqual({ synced: 1, failed: 1 });
        errSpy.mockRestore();
    });

    it('returns zeroes when the finder itself throws', async () => {
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const payload = { find: vi.fn(), create: vi.fn(), update: vi.fn() } as never;
        const result = await seedTenantsForExistingShops({
            payload,
            findShops: async () => {
                throw new Error('mongo down');
            },
        });
        expect(result).toEqual({ synced: 0, failed: 0 });
        errSpy.mockRestore();
    });

    it('is a no-op when no shops exist', async () => {
        const find = vi.fn();
        const create = vi.fn();
        const payload = { find, create, update: vi.fn() } as never;
        const result = await seedTenantsForExistingShops({
            payload,
            findShops: async () => [],
        });
        expect(result).toEqual({ synced: 0, failed: 0 });
        expect(create).not.toHaveBeenCalled();
    });
});

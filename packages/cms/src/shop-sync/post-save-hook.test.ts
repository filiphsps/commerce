import { describe, expect, it, vi } from 'vitest';
import { syncShopToTenant } from './post-save-hook';

describe('syncShopToTenant', () => {
    it('upserts a tenant matching the shop _id', async () => {
        const find = vi.fn(async () => ({ docs: [] }));
        const create = vi.fn(async () => ({ id: 't1' }));
        const update = vi.fn(async () => ({ id: 't1' }));
        const payload = { find, create, update } as never;
        await syncShopToTenant(payload, {
            id: 'shop_abc',
            name: 'Swedish Candy Store',
            domain: 'swedish-candy-store.com',
            i18n: { defaultLocale: 'sv', locales: ['sv', 'en-US'] },
        });
        expect(create).toHaveBeenCalledWith({
            collection: 'tenants',
            data: expect.objectContaining({
                shopId: 'shop_abc',
                name: 'Swedish Candy Store',
                slug: 'swedish-candy-store-com',
                defaultLocale: 'sv',
                locales: ['sv', 'en-US'],
            }),
        });
    });

    it('updates an existing tenant when one exists for the shopId', async () => {
        const find = vi.fn(async () => ({ docs: [{ id: 'existing' }] }));
        const create = vi.fn();
        const update = vi.fn(async () => ({ id: 'existing' }));
        const payload = { find, create, update } as never;
        await syncShopToTenant(payload, {
            id: 'shop_abc',
            name: 'Renamed',
            domain: 'renamed.com',
            i18n: { defaultLocale: 'en-US', locales: ['en-US'] },
        });
        expect(update).toHaveBeenCalledWith({
            collection: 'tenants',
            id: 'existing',
            data: expect.objectContaining({ name: 'Renamed' }),
        });
        expect(create).not.toHaveBeenCalled();
    });
});

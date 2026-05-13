import { describe, expect, it, vi } from 'vitest';
import { attachShopSync, syncShopToTenant } from './post-save-hook';

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
            overrideAccess: true,
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
            overrideAccess: true,
        });
        expect(create).not.toHaveBeenCalled();
    });

    it('reflects the domain rename in the tenant slug', async () => {
        const find = vi.fn(async () => ({ docs: [{ id: 'existing' }] }));
        const update = vi.fn(async () => ({ id: 'existing' }));
        const payload = { find, create: vi.fn(), update } as never;
        await syncShopToTenant(payload, {
            id: 'shop_abc',
            name: 'Renamed',
            domain: 'New-Brand_Hub.example.COM',
            i18n: { defaultLocale: 'en-US', locales: ['en-US'] },
        });
        expect(update).toHaveBeenCalledWith({
            collection: 'tenants',
            id: 'existing',
            data: expect.objectContaining({ slug: 'new-brand-hub-example-com' }),
            overrideAccess: true,
        });
    });

    it('is idempotent: a second run with the same shop only updates, never creates', async () => {
        const find = vi
            .fn()
            .mockImplementationOnce(async () => ({ docs: [] }))
            .mockImplementationOnce(async () => ({ docs: [{ id: 't-1' }] }));
        const create = vi.fn(async () => ({ id: 't-1' }));
        const update = vi.fn(async () => ({ id: 't-1' }));
        const payload = { find, create, update } as never;
        const shop = {
            id: 'shop_abc',
            name: 'Swedish Candy Store',
            domain: 'swedish-candy-store.com',
            i18n: { defaultLocale: 'en-US', locales: ['en-US'] },
        };
        await syncShopToTenant(payload, shop);
        await syncShopToTenant(payload, shop);
        expect(create).toHaveBeenCalledTimes(1);
        expect(update).toHaveBeenCalledTimes(1);
    });

    it('passes the full locales array through', async () => {
        const create = vi.fn(async () => ({ id: 't-multi' }));
        const payload = {
            find: async () => ({ docs: [] }),
            create,
            update: vi.fn(),
        } as never;
        await syncShopToTenant(payload, {
            id: 'shop-multi',
            name: 'Multi-locale Shop',
            domain: 'multi.example',
            i18n: { defaultLocale: 'fr', locales: ['fr', 'es', 'de'] },
        });
        expect(create).toHaveBeenCalledWith({
            collection: 'tenants',
            data: expect.objectContaining({ defaultLocale: 'fr', locales: ['fr', 'es', 'de'] }),
            overrideAccess: true,
        });
    });
});

describe('attachShopSync', () => {
    it('registers a post-save handler on model.schema (Mongoose Model shape)', () => {
        const post = vi.fn();
        const model = { schema: { post } } as never;
        attachShopSync(model, {} as never);
        expect(post).toHaveBeenCalledWith('save', expect.any(Function));
    });

    it('falls back to model.post when handed a raw schema', () => {
        const post = vi.fn();
        attachShopSync({ post } as never, {} as never);
        expect(post).toHaveBeenCalledWith('save', expect.any(Function));
    });

    it('prefers schema.post when both are present (Model wins over raw)', () => {
        const schemaPost = vi.fn();
        const modelPost = vi.fn();
        attachShopSync({ schema: { post: schemaPost }, post: modelPost } as never, {} as never);
        expect(schemaPost).toHaveBeenCalledTimes(1);
        expect(modelPost).not.toHaveBeenCalled();
    });

    it('throws TypeError when handed something with no post hook', () => {
        expect(() => attachShopSync({} as never, {} as never)).toThrow(TypeError);
    });

    it("invokes syncShopToTenant for the saved doc and doesn't throw on errors", async () => {
        let captured: ((doc: unknown) => Promise<void>) | undefined;
        const post = vi.fn((_event: string, fn: (doc: unknown) => Promise<void>) => {
            captured = fn;
        });
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const payload = {
            find: vi.fn(async () => {
                throw new Error('boom');
            }),
            create: vi.fn(),
            update: vi.fn(),
        } as never;
        attachShopSync({ schema: { post } } as never, payload);
        expect(captured).toBeDefined();
        const handler = captured!;
        await expect(
            handler({
                id: 'shop-err',
                name: 'X',
                domain: 'x.com',
                i18n: { defaultLocale: 'en-US', locales: ['en-US'] },
            }),
        ).resolves.toBeUndefined();
        expect(errSpy).toHaveBeenCalled();
        errSpy.mockRestore();
    });

    it('does not invoke any payload op until the post-save event actually fires', () => {
        const find = vi.fn();
        const create = vi.fn();
        const update = vi.fn();
        const post = vi.fn();
        attachShopSync({ schema: { post } } as never, { find, create, update } as never);
        expect(find).not.toHaveBeenCalled();
        expect(create).not.toHaveBeenCalled();
        expect(update).not.toHaveBeenCalled();
    });

    it('is idempotent across repeated calls on the same schema (no duplicate listeners)', () => {
        const post = vi.fn();
        const schema = { post };
        attachShopSync({ schema } as never, {} as never);
        attachShopSync({ schema } as never, {} as never);
        attachShopSync({ schema } as never, {} as never);
        expect(post).toHaveBeenCalledTimes(1);
    });

    it('is idempotent when handed the same raw schema twice', () => {
        const post = vi.fn();
        const raw = { post };
        attachShopSync(raw as never, {} as never);
        attachShopSync(raw as never, {} as never);
        expect(post).toHaveBeenCalledTimes(1);
    });

    it('passes overrideAccess: true on the underlying payload calls (server-side sync)', async () => {
        let captured: ((doc: unknown) => Promise<void>) | undefined;
        const post = vi.fn((_event: string, fn: (doc: unknown) => Promise<void>) => {
            captured = fn;
        });
        const find = vi.fn(async () => ({ docs: [] }));
        const create = vi.fn(async () => ({ id: 't-x' }));
        const update = vi.fn();
        const payload = { find, create, update } as never;
        attachShopSync({ schema: { post } } as never, payload);
        await captured!({
            id: 'shop-ovr',
            name: 'Override',
            domain: 'ovr.example',
            i18n: { defaultLocale: 'en-US', locales: ['en-US'] },
        });
        expect(find).toHaveBeenCalledWith(expect.objectContaining({ overrideAccess: true }));
        expect(create).toHaveBeenCalledWith(expect.objectContaining({ overrideAccess: true }));
    });

    it('accepts a lazy payload resolver so the hook can attach before Payload boots', async () => {
        let captured: ((doc: unknown) => Promise<void>) | undefined;
        const post = vi.fn((_event: string, fn: (doc: unknown) => Promise<void>) => {
            captured = fn;
        });
        const find = vi.fn(async () => ({ docs: [] }));
        const create = vi.fn(async () => ({ id: 't-late' }));
        const update = vi.fn();
        const getPayload = vi.fn(async () => ({ find, create, update }) as never);
        attachShopSync({ schema: { post } } as never, getPayload);
        // Hook registers immediately, before any payload resolution.
        expect(getPayload).not.toHaveBeenCalled();
        await captured!({
            id: 'shop-late',
            name: 'Lazy',
            domain: 'lazy.example',
            i18n: { defaultLocale: 'en-US', locales: ['en-US'] },
        });
        expect(getPayload).toHaveBeenCalledTimes(1);
        expect(create).toHaveBeenCalled();
    });
});

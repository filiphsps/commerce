import type { Payload } from 'payload';
import { describe, expect, it, vi } from 'vitest';
import { __resetTenantIdCache, resolveTenantId } from './resolve-tenant-id';

// The resolver is the bridge between the source-of-truth Shop (Mongoose model
// in `@nordcom/commerce-db`) and the tenant key the multi-tenant plugin scopes
// by. Since UNIFY-03 repointed `tenantsSlug` to `shops`, the tenant key IS the
// shop row id, so resolution collapses to identity over the shop id: confirm
// the shop row exists in the unified `shops` collection and return that same
// id. Bugs here are silent: a miss returns `null` and callers refuse to broaden
// the predicate, so we lose data; a stale-cache hit from one Payload instance
// leaking into another would cross-tenant leak. These tests pin both edges.

type FindArgs = Parameters<Payload['find']>[0];

const makePayload = (docs: Array<{ id: string }> = []) => {
    const find = vi.fn(async (_args: FindArgs) => ({
        docs,
        totalDocs: docs.length,
        hasNextPage: false,
        hasPrevPage: false,
    }));
    return { payload: { find } as unknown as Payload, find };
};

describe('resolveTenantId', () => {
    it('returns the shop id for an existing shop — the shop row id IS the tenant key', async () => {
        const { payload, find } = makePayload([{ id: 'shop-1' }]);
        const result = await resolveTenantId(payload, 'shop-1');
        expect(result).toBe('shop-1');
        expect(find).toHaveBeenCalledWith({
            collection: 'shops',
            where: { id: { equals: 'shop-1' } },
            limit: 1,
            depth: 0,
            overrideAccess: true,
        });
        __resetTenantIdCache(payload);
    });

    it('returns null when no shop row matches the given id', async () => {
        const { payload } = makePayload([]);
        const result = await resolveTenantId(payload, 'shop-without-row');
        expect(result).toBeNull();
        __resetTenantIdCache(payload);
    });

    it('returns null for an empty shop id without touching the database', async () => {
        const { payload, find } = makePayload([{ id: 'shop-1' }]);
        const result = await resolveTenantId(payload, '');
        expect(result).toBeNull();
        expect(find).not.toHaveBeenCalled();
        __resetTenantIdCache(payload);
    });

    it('queries the shops collection with the exact read-contract args on a cache miss', async () => {
        const { payload, find } = makePayload([{ id: 'shop-1' }]);
        await resolveTenantId(payload, 'shop-1');
        expect(find).toHaveBeenCalledWith({
            collection: 'shops',
            where: { id: { equals: 'shop-1' } },
            limit: 1,
            depth: 0,
            overrideAccess: true,
        });
        __resetTenantIdCache(payload);
    });

    it('caches positive lookups per Payload instance — second call hits the cache', async () => {
        const { payload, find } = makePayload([{ id: 'shop-1' }]);
        await resolveTenantId(payload, 'shop-1');
        await resolveTenantId(payload, 'shop-1');
        expect(find).toHaveBeenCalledTimes(1);
        __resetTenantIdCache(payload);
    });

    it('returns the cached value (not just a skipped query) on a cache hit', async () => {
        const { payload } = makePayload([{ id: 'shop-1' }]);
        const first = await resolveTenantId(payload, 'shop-1');
        const second = await resolveTenantId(payload, 'shop-1');
        expect(first).toBe('shop-1');
        expect(second).toBe(first);
        __resetTenantIdCache(payload);
    });

    it('does not cache null results — a later create can populate the shop without a stale miss', async () => {
        const { payload, find } = makePayload([]);
        await resolveTenantId(payload, 'shop-1');
        await resolveTenantId(payload, 'shop-1');
        // Both calls hit the database — no stale negative caching.
        expect(find).toHaveBeenCalledTimes(2);
        __resetTenantIdCache(payload);
    });

    it('keeps caches isolated between distinct Payload instances', async () => {
        const a = makePayload([{ id: 'shop-1' }]);
        const b = makePayload([{ id: 'shop-2' }]);
        const fromA = await resolveTenantId(a.payload, 'shop-1');
        const fromB = await resolveTenantId(b.payload, 'shop-2');
        expect(fromA).toBe('shop-1');
        expect(fromB).toBe('shop-2');
        __resetTenantIdCache(a.payload);
        __resetTenantIdCache(b.payload);
    });

    it('caches each shop id separately on the same Payload instance', async () => {
        const find = vi.fn(async (args: FindArgs) => {
            const where = args.where as { id?: { equals?: string } } | undefined;
            const shopId = where?.id?.equals;
            return {
                docs: shopId ? [{ id: shopId }] : [],
                totalDocs: shopId ? 1 : 0,
                hasNextPage: false,
                hasPrevPage: false,
            };
        });
        const payload = { find } as unknown as Payload;

        const first = await resolveTenantId(payload, 'shop-1');
        const second = await resolveTenantId(payload, 'shop-2');
        const firstAgain = await resolveTenantId(payload, 'shop-1');
        expect(first).toBe('shop-1');
        expect(second).toBe('shop-2');
        expect(firstAgain).toBe('shop-1');
        // Two distinct shop ids → two database calls; the repeat hits the cache.
        expect(find).toHaveBeenCalledTimes(2);
        __resetTenantIdCache(payload);
    });
});

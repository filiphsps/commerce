import type { Payload } from 'payload';
import { describe, expect, it, vi } from 'vitest';
import { __resetTenantIdCache, resolveTenantId } from './resolve-tenant-id';

// The resolver is the bridge between the source-of-truth Shop (Mongoose model
// in `@nordcom/commerce-db`) and the Payload Tenant document the multi-tenant
// plugin uses for scoping. Bugs here are silent: a miss returns `null` and
// callers refuse to broaden the predicate, so we lose data; a stale-cache hit
// from one Payload instance leaking into another would cross-tenant leak.
// These tests pin both edges.

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
    it('returns the Tenant document id for a given Shop id', async () => {
        const { payload, find } = makePayload([{ id: 'tenant-1' }]);
        const result = await resolveTenantId(payload, 'shop-1');
        expect(result).toBe('tenant-1');
        expect(find).toHaveBeenCalledWith({
            collection: 'tenants',
            where: { shopId: { equals: 'shop-1' } },
            limit: 1,
            depth: 0,
            overrideAccess: true,
        });
        __resetTenantIdCache(payload);
    });

    it('returns null when no Tenant exists for the given Shop id', async () => {
        const { payload } = makePayload([]);
        const result = await resolveTenantId(payload, 'shop-without-tenant');
        expect(result).toBeNull();
        __resetTenantIdCache(payload);
    });

    it('returns null for an empty shop id without touching the database', async () => {
        const { payload, find } = makePayload([{ id: 'tenant-1' }]);
        const result = await resolveTenantId(payload, '');
        expect(result).toBeNull();
        expect(find).not.toHaveBeenCalled();
        __resetTenantIdCache(payload);
    });

    it('caches positive lookups per Payload instance — second call hits the cache', async () => {
        const { payload, find } = makePayload([{ id: 'tenant-1' }]);
        await resolveTenantId(payload, 'shop-1');
        await resolveTenantId(payload, 'shop-1');
        expect(find).toHaveBeenCalledTimes(1);
        __resetTenantIdCache(payload);
    });

    it('does not cache null results — a later sync can populate the tenant without a stale miss', async () => {
        const { payload, find } = makePayload([]);
        await resolveTenantId(payload, 'shop-1');
        await resolveTenantId(payload, 'shop-1');
        // Both calls hit the database — no stale negative caching.
        expect(find).toHaveBeenCalledTimes(2);
        __resetTenantIdCache(payload);
    });

    it('keeps caches isolated between distinct Payload instances', async () => {
        const a = makePayload([{ id: 'tenant-1' }]);
        const b = makePayload([{ id: 'tenant-2' }]);
        const fromA = await resolveTenantId(a.payload, 'shop-1');
        const fromB = await resolveTenantId(b.payload, 'shop-1');
        expect(fromA).toBe('tenant-1');
        expect(fromB).toBe('tenant-2');
        __resetTenantIdCache(a.payload);
        __resetTenantIdCache(b.payload);
    });

    it('caches each shop id separately on the same Payload instance', async () => {
        const find = vi.fn(async (args: FindArgs) => {
            const where = args.where as { shopId?: { equals?: string } } | undefined;
            const shopId = where?.shopId?.equals;
            return {
                docs: shopId === 'shop-1' ? [{ id: 'tenant-1' }] : [{ id: 'tenant-2' }],
                totalDocs: 1,
                hasNextPage: false,
                hasPrevPage: false,
            };
        });
        const payload = { find } as unknown as Payload;

        const first = await resolveTenantId(payload, 'shop-1');
        const second = await resolveTenantId(payload, 'shop-2');
        const firstAgain = await resolveTenantId(payload, 'shop-1');
        expect(first).toBe('tenant-1');
        expect(second).toBe('tenant-2');
        expect(firstAgain).toBe('tenant-1');
        // Two distinct shop ids → two database calls; the repeat hits the cache.
        expect(find).toHaveBeenCalledTimes(2);
        __resetTenantIdCache(payload);
    });
});

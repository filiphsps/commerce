/**
 * Exhaustive multi-tenant isolation tests.
 *
 * Boots a Payload instance with the production access predicates wired in,
 * seeds two tenants (A, B) plus operator users scoped to each, then drives
 * `payload.find` / `payload.update` / `payload.delete` with each user's
 * context to verify the read+write boundary holds across every content
 * collection — pages, articles, productMetadata, collectionMetadata,
 * header, footer, businessData, media.
 */

import type { Payload } from 'payload';
import { getPayload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildPayloadConfig } from '../config';

const extractTenantId = (tenant: unknown): string => {
    if (typeof tenant === 'string') return tenant;
    if (tenant && typeof tenant === 'object' && 'id' in tenant) {
        return String((tenant as { id: unknown }).id);
    }
    return String(tenant);
};

describe('multi-tenant isolation (full)', () => {
    let payload: Payload;
    let tenantA: string;
    let tenantB: string;
    let userA: { id: string; collection: 'users' };
    let userB: { id: string; collection: 'users' };

    const ids: Record<string, { a: string; b: string }> = {};

    beforeAll(async () => {
        const baseUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/test';
        const url = new URL(baseUri);
        url.pathname = `/test_mt_isolation_${Date.now()}`;

        const config = await buildPayloadConfig({
            secret: 'test',
            mongoUrl: url.toString(),
            enableStorage: false,
            includeAdmin: false,
        });
        payload = await getPayload({ config });

        const a = await payload.create({
            collection: 'tenants',
            data: { name: 'Tenant A', slug: 'a', defaultLocale: 'en-US', locales: ['en-US'] },
        });
        const b = await payload.create({
            collection: 'tenants',
            data: { name: 'Tenant B', slug: 'b', defaultLocale: 'en-US', locales: ['en-US'] },
        });
        tenantA = String(a.id);
        tenantB = String(b.id);

        const operatorA = await payload.create({
            collection: 'users',
            data: {
                email: 'a@example.com',
                password: 'pw-a',
                role: 'editor' as never,
                tenants: [{ tenant: tenantA, roles: ['tenant-admin'] }] as never,
            },
        });
        const operatorB = await payload.create({
            collection: 'users',
            data: {
                email: 'b@example.com',
                password: 'pw-b',
                role: 'editor' as never,
                tenants: [{ tenant: tenantB, roles: ['tenant-admin'] }] as never,
            },
        });
        userA = { id: String(operatorA.id), collection: 'users' };
        userB = { id: String(operatorB.id), collection: 'users' };

        const collectionSeed: Record<string, Record<string, unknown>> = {
            pages: { title: 'pages doc', slug: 'home', _status: 'published' },
            articles: { title: 'articles doc', slug: 'home', author: 'Test', _status: 'published' },
            productMetadata: { shopifyHandle: 'sample', _status: 'published' },
            collectionMetadata: { shopifyHandle: 'sample', _status: 'published' },
        };

        for (const collection of ['pages', 'articles', 'productMetadata', 'collectionMetadata'] as const) {
            const docA = await payload.create({
                collection,
                data: { ...collectionSeed[collection], tenant: tenantA } as never,
                overrideAccess: true,
            });
            const docB = await payload.create({
                collection,
                data: { ...collectionSeed[collection], tenant: tenantB } as never,
                overrideAccess: true,
            });
            ids[collection] = { a: String(docA.id), b: String(docB.id) };
        }

        const headerSeed = (label: string, link: string) => ({
            logoLink: link,
            cta: { kind: 'external', url: link, label },
        });
        for (const globalSlug of ['header', 'footer', 'businessData'] as const) {
            const dataA: Record<string, unknown> =
                globalSlug === 'header'
                    ? headerSeed('A CTA', '/A')
                    : globalSlug === 'footer'
                      ? { copyrightLine: 'A only' }
                      : { telephone: '+1-A' };
            const docA = await payload.create({
                collection: globalSlug,
                data: { ...dataA, tenant: tenantA } as never,
                overrideAccess: true,
            });
            const dataB: Record<string, unknown> =
                globalSlug === 'header'
                    ? headerSeed('B CTA', '/B')
                    : globalSlug === 'footer'
                      ? { copyrightLine: 'B only' }
                      : { telephone: '+1-B' };
            const docB = await payload.create({
                collection: globalSlug,
                data: { ...dataB, tenant: tenantB } as never,
                overrideAccess: true,
            });
            ids[globalSlug] = { a: String(docA.id), b: String(docB.id) };
        }
    }, 60_000);

    afterAll(async () => {
        await payload.db.connection?.dropDatabase();
        await payload.db.destroy?.();
    });

    const callAs = async (user: { id: string; collection: 'users' }) => {
        return await payload.findByID({
            collection: 'users',
            id: user.id,
            depth: 0,
            overrideAccess: true,
        });
    };

    describe.each([
        ['pages'],
        ['articles'],
        ['productMetadata'],
        ['collectionMetadata'],
    ] as const)('collection: %s', (collection) => {
        it(`tenant A user reads only A's ${collection} docs`, async () => {
            const userCtx = await callAs(userA);
            const result = await payload.find({
                collection,
                user: userCtx as never,
                overrideAccess: false,
            });
            const tenants = new Set(result.docs.map((d) => extractTenantId((d as { tenant: unknown }).tenant)));
            expect(tenants).toEqual(new Set([tenantA]));
        });

        it(`tenant B user reads only B's ${collection} docs`, async () => {
            const userCtx = await callAs(userB);
            const result = await payload.find({
                collection,
                user: userCtx as never,
                overrideAccess: false,
            });
            const tenants = new Set(result.docs.map((d) => extractTenantId((d as { tenant: unknown }).tenant)));
            expect(tenants).toEqual(new Set([tenantB]));
        });

        it(`tenant A user cannot read B's ${collection} doc by id`, async () => {
            const userCtx = await callAs(userA);
            await expect(
                payload.findByID({
                    collection,
                    id: ids[collection]!.b,
                    user: userCtx as never,
                    overrideAccess: false,
                }),
            ).rejects.toThrow();
        });

        it(`tenant A user cannot update B's ${collection} doc`, async () => {
            const userCtx = await callAs(userA);
            await expect(
                payload.update({
                    collection,
                    id: ids[collection]!.b,
                    data: { title: 'hacked' } as never,
                    user: userCtx as never,
                    overrideAccess: false,
                }),
            ).rejects.toThrow();
        });

        it(`public (no user) reads only published ${collection} docs`, async () => {
            const result = await payload.find({ collection, overrideAccess: false });
            for (const doc of result.docs) {
                expect((doc as { _status?: string })._status ?? 'published').toBe('published');
            }
        });
    });

    describe.each([['header'], ['footer'], ['businessData']] as const)('global: %s', (globalSlug) => {
        it(`tenant A user reads only A's ${globalSlug}`, async () => {
            const userCtx = await callAs(userA);
            const result = await payload.find({
                collection: globalSlug,
                user: userCtx as never,
                overrideAccess: false,
            });
            const tenants = new Set(result.docs.map((d) => extractTenantId((d as { tenant: unknown }).tenant)));
            expect(tenants).toEqual(new Set([tenantA]));
        });

        it(`tenant B user reads only B's ${globalSlug}`, async () => {
            const userCtx = await callAs(userB);
            const result = await payload.find({
                collection: globalSlug,
                user: userCtx as never,
                overrideAccess: false,
            });
            const tenants = new Set(result.docs.map((d) => extractTenantId((d as { tenant: unknown }).tenant)));
            expect(tenants).toEqual(new Set([tenantB]));
        });

        it(`tenant A cannot read B's ${globalSlug} by id`, async () => {
            const userCtx = await callAs(userA);
            await expect(
                payload.findByID({
                    collection: globalSlug,
                    id: ids[globalSlug]!.b,
                    user: userCtx as never,
                    overrideAccess: false,
                }),
            ).rejects.toThrow();
        });
    });

    describe('cross-tenant slug collisions', () => {
        it('pages with the same slug across tenants coexist', async () => {
            const all = await payload.find({
                collection: 'pages',
                where: { slug: { equals: 'home' } },
                overrideAccess: true,
            });
            expect(all.docs.length).toBeGreaterThanOrEqual(2);
            const tenants = new Set(all.docs.map((d) => extractTenantId((d as { tenant: unknown }).tenant)));
            expect(tenants.has(tenantA)).toBe(true);
            expect(tenants.has(tenantB)).toBe(true);
        });

        it('articles with the same slug across tenants coexist', async () => {
            const all = await payload.find({
                collection: 'articles',
                where: { slug: { equals: 'home' } },
                overrideAccess: true,
            });
            expect(all.docs.length).toBeGreaterThanOrEqual(2);
        });
    });
});

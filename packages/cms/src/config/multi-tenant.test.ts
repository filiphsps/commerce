import type { Payload } from 'payload';
import { getPayload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildPayloadConfig } from './index';

describe('multi-tenant isolation', () => {
    let payload: Payload;
    let aId: string;
    let bId: string;

    beforeAll(async () => {
        const baseUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/test';
        const url = new URL(baseUri);
        url.pathname = `/test_mt_${Date.now()}`;
        const config = await buildPayloadConfig({
            secret: 'test',
            mongoUrl: url.toString(),
            enableStorage: false,
            includeAdmin: false,
        });
        payload = await getPayload({ config });
        const a = await payload.create({
            collection: 'tenants',
            data: { name: 'A', slug: 'a', defaultLocale: 'en-US', locales: ['en-US'] },
        });
        const b = await payload.create({
            collection: 'tenants',
            data: { name: 'B', slug: 'b', defaultLocale: 'en-US', locales: ['en-US'] },
        });
        aId = String(a.id);
        bId = String(b.id);
        await payload.create({ collection: 'pages', data: { slug: 'home', title: 'A home', tenant: aId } });
        await payload.create({ collection: 'pages', data: { slug: 'home', title: 'B home', tenant: bId } });
    });

    afterAll(async () => {
        await payload.db.connection?.dropDatabase();
        await payload.db.destroy?.();
    });

    it('a query filtered to tenant A returns only A pages', async () => {
        const result = await payload.find({
            collection: 'pages',
            where: { tenant: { equals: aId } },
        });
        expect(result.docs).toHaveLength(1);
        expect(result.docs[0]?.title).toBe('A home');
    });

    it('a query filtered to tenant B returns only B pages', async () => {
        const result = await payload.find({
            collection: 'pages',
            where: { tenant: { equals: bId } },
        });
        expect(result.docs).toHaveLength(1);
        expect(result.docs[0]?.title).toBe('B home');
    });

    it('both pages share the same slug but different tenants', async () => {
        const all = await payload.find({ collection: 'pages', where: { slug: { equals: 'home' } } });
        expect(all.docs).toHaveLength(2);
    });
});

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { buildConfig, getPayload } from 'payload';
import type { Payload } from 'payload';
import { tenants } from './tenants';

describe('tenants collection', () => {
    let payload: Payload;

    beforeAll(async () => {
        const baseUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/test';
        const url = new URL(baseUri);
        url.pathname = `/test_tenants_${Date.now()}`;
        const config = await buildConfig({
            secret: 'test',
            db: mongooseAdapter({ url: url.toString() }),
            editor: lexicalEditor({}),
            collections: [tenants],
        });
        payload = await getPayload({ config });
    });

    afterAll(async () => {
        await payload.db.connection?.dropDatabase();
        await payload.db.destroy?.();
    });

    it('creates a tenant with required fields', async () => {
        const tenant = await payload.create({
            collection: 'tenants',
            data: {
                name: 'Swedish Candy Store',
                slug: 'swedish-candy-store',
                defaultLocale: 'sv',
                locales: ['sv', 'en-US'],
            },
        });
        expect(tenant.name).toBe('Swedish Candy Store');
        expect(tenant.slug).toBe('swedish-candy-store');
        expect(tenant.defaultLocale).toBe('sv');
        expect(tenant.locales).toEqual(['sv', 'en-US']);
    });

    it('rejects missing required fields', async () => {
        await expect(
            payload.create({ collection: 'tenants', data: { name: 'Missing slug' } as never }),
        ).rejects.toThrow();
    });
});

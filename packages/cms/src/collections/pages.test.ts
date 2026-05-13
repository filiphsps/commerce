import type { Payload } from 'payload';
import { getPayload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildTestConfig } from '../test-utils/build-test-config';

describe('pages collection', () => {
    let payload: Payload;
    let tenantId: string;

    beforeAll(async () => {
        const config = await buildTestConfig({ suite: 'pages', locales: ['en-US', 'sv'] });
        payload = await getPayload({ config });
        const t = await payload.create({
            collection: 'tenants',
            data: { name: 'X', slug: 'x', defaultLocale: 'en-US', locales: ['en-US', 'sv'] },
        });
        tenantId = String(t.id);
    });

    afterAll(async () => {
        await payload.db.connection?.dropDatabase();
        await payload.db.destroy?.();
    });

    it('creates a draft page', async () => {
        const page = await payload.create({
            collection: 'pages',
            data: { slug: 'home', title: 'Home', tenant: tenantId, _status: 'draft' },
        });
        expect(page.slug).toBe('home');
        expect(page._status).toBe('draft');
    });

    it('requires slug', async () => {
        await expect(
            payload.create({ collection: 'pages', data: { title: 'Missing slug', tenant: tenantId } as never }),
        ).rejects.toThrow();
    });

    it('supports locales for title', async () => {
        const page = await payload.create({
            collection: 'pages',
            locale: 'en-US',
            data: { slug: 'about', title: 'About', tenant: tenantId },
        });
        await payload.update({
            collection: 'pages',
            id: page.id,
            locale: 'sv',
            data: { title: 'Om oss' },
        });
        const sv = await payload.findByID({ collection: 'pages', id: page.id, locale: 'sv' });
        const en = await payload.findByID({ collection: 'pages', id: page.id, locale: 'en-US' });
        expect(sv.title).toBe('Om oss');
        expect(en.title).toBe('About');
    });
});

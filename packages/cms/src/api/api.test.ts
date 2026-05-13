import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getPayload } from 'payload';
import type { Payload } from 'payload';
import { buildPayloadConfig } from '../config';
import { getArticle } from './get-article';
import { getArticles } from './get-articles';
import { getPage } from './get-page';

describe('query API', () => {
    let payload: Payload;
    let tenantId: string;

    beforeAll(async () => {
        const baseUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/test';
        const url = new URL(baseUri);
        url.pathname = `/test_api_${Date.now()}`;
        const config = await buildPayloadConfig({
            secret: 'test',
            mongoUrl: url.toString(),
            enableStorage: false,
            includeAdmin: false,
        });
        payload = await getPayload({ config });
        const t = await payload.create({
            collection: 'tenants',
            data: { name: 'X', slug: 'x', defaultLocale: 'en-US', locales: ['en-US', 'sv'] },
        });
        tenantId = String(t.id);

        await payload.create({
            collection: 'pages',
            data: { slug: 'home', title: 'Home EN', tenant: tenantId, _status: 'published' },
            locale: 'en-US',
        });
        await payload.create({
            collection: 'articles',
            data: { slug: 'hello', title: 'Hello', author: 'A', tenant: tenantId, _status: 'published' },
        });
    });

    afterAll(async () => {
        await payload.db.connection?.dropDatabase();
        await payload.db.destroy?.();
    });

    const shop = () => ({ id: tenantId, domain: 'x.test', i18n: { defaultLocale: 'en-US' } });

    it('getPage finds by slug + tenant', async () => {
        const page = await getPage({ shop: shop(), locale: { code: 'en-US' }, slug: 'home', __payload: payload });
        expect(page?.title).toBe('Home EN');
    });

    it('getPage returns null for missing slug', async () => {
        const page = await getPage({
            shop: shop(),
            locale: { code: 'en-US' },
            slug: 'does-not-exist',
            __payload: payload,
        });
        expect(page).toBeNull();
    });

    it('getArticle finds by slug', async () => {
        const article = await getArticle({
            shop: shop(),
            locale: { code: 'en-US' },
            slug: 'hello',
            __payload: payload,
        });
        expect(article?.author).toBe('A');
    });

    it('getArticles paginates', async () => {
        const list = await getArticles({ shop: shop(), locale: { code: 'en-US' }, limit: 10, __payload: payload });
        expect(list.docs).toHaveLength(1);
    });
});

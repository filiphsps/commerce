import { Shop } from '@nordcom/commerce-db';
import type { Field } from 'payload';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { shopBridge, stripCommerceProviderSecrets } from './shop';

const cleanup = async () => {
    await Shop.model.deleteMany({}).exec();
};

describe('shopBridge manifest', () => {
    it('has the expected slug and label', () => {
        expect(shopBridge.slug).toBe('shop');
        expect(shopBridge.label.singular).toBe('Shop');
    });

    it('declares the required core fields', () => {
        const names = shopBridge.fields.map((f: Field) => ('name' in f ? f.name : undefined));
        expect(names).toEqual(
            expect.arrayContaining(['name', 'description', 'domain', 'alternativeDomains', 'i18n', 'design']),
        );
    });
});

describe('stripCommerceProviderSecrets', () => {
    it('drops commerceProvider.authentication.token', () => {
        const input = {
            commerceProvider: {
                type: 'shopify',
                authentication: { token: 'secret', publicToken: 'pub', domain: 'd' },
            },
        };
        const out = stripCommerceProviderSecrets(input) as typeof input;
        expect(out.commerceProvider.authentication).not.toHaveProperty('token');
        expect(out.commerceProvider.authentication.publicToken).toBe('pub');
    });

    it('drops commerceProvider.authentication.customers.clientSecret', () => {
        const input = {
            commerceProvider: {
                type: 'shopify',
                authentication: {
                    customers: { id: 'i', clientId: 'c', clientSecret: 'sss' },
                },
            },
        };
        const out = stripCommerceProviderSecrets(input) as {
            commerceProvider: { authentication: { customers: Record<string, unknown> } };
        };
        expect(out.commerceProvider.authentication.customers).not.toHaveProperty('clientSecret');
    });

    it('returns input unchanged when no commerceProvider', () => {
        expect(stripCommerceProviderSecrets({ name: 'A' })).toEqual({ name: 'A' });
    });
});

describe('shopBridge adapter (domain lookup)', () => {
    beforeEach(cleanup);
    afterAll(cleanup);

    it('findById by canonical domain', async () => {
        await Shop.model.create({
            name: 'A',
            domain: 'a.test',
            icons: { favicon: { src: '/favicon.ico', alt: 'A' } },
            design: { header: { logo: { src: '/a', alt: 'a' } }, accents: [] },
            commerceProvider: { type: 'shopify' },
        } as Parameters<typeof Shop.model.create>[0]);
        const found = await shopBridge.adapter.findById('a.test');
        expect((found as { name: string } | null)?.name).toBe('A');
    });

    it('findById by alternative domain', async () => {
        await Shop.model.create({
            name: 'A',
            domain: 'a.test',
            alternativeDomains: ['a2.test'],
            icons: { favicon: { src: '/favicon.ico', alt: 'A' } },
            design: { header: { logo: { src: '/a', alt: 'a' } }, accents: [] },
            commerceProvider: { type: 'shopify' },
        } as Parameters<typeof Shop.model.create>[0]);
        const found = await shopBridge.adapter.findById('a2.test');
        expect((found as { name: string } | null)?.name).toBe('A');
    });

    it('findById returns null when no match', async () => {
        expect(await shopBridge.adapter.findById('missing.test')).toBeNull();
    });

    it('findById redacts the Shopify token', async () => {
        await Shop.model.create({
            name: 'A',
            domain: 'a.test',
            icons: { favicon: { src: '/favicon.ico', alt: 'A' } },
            design: { header: { logo: { src: '/a', alt: 'a' } }, accents: [] },
            commerceProvider: {
                type: 'shopify',
                authentication: { token: 'leak', publicToken: 'ok' },
            },
        } as Parameters<typeof Shop.model.create>[0]);
        const found = (await shopBridge.adapter.findById('a.test')) as {
            commerceProvider: { authentication: Record<string, unknown> };
        } | null;
        expect(found?.commerceProvider.authentication).not.toHaveProperty('token');
        expect(found?.commerceProvider.authentication.publicToken).toBe('ok');
    });
});

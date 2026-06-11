import { afterEach, describe, expect, it } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockCollectionMetadata, mockProductMetadata, mockShop } from '@/utils/test/fixtures';
import { __setCmsReadQuery } from './_cms-read';
import { CollectionMetadataApi, ProductMetadataApi } from './metadata';

/**
 * Installs a capturing read transport whose query resolves with the supplied value.
 *
 * @param value - The value every Convex query resolves with.
 * @returns The captured query invocations.
 */
function installQuery(value: unknown): { queries: Array<{ name: string; args: Record<string, unknown> }> } {
    const queries: Array<{ name: string; args: Record<string, unknown> }> = [];
    __setCmsReadQuery((name, args) => {
        queries.push({ name, args });
        return Promise.resolve(value);
    });
    return { queries };
}

afterEach(() => {
    __setCmsReadQuery(null);
});

describe('ProductMetadataApi — Convex-native (TEARDOWN-02 straight-line)', () => {
    it('resolves by the Shopify product handle and serves the Convex overlay untouched', async () => {
        const meta = mockProductMetadata({ shopifyHandle: 'mug' });
        const { queries } = installQuery(meta);

        const result = await ProductMetadataApi({ shop: mockShop(), locale: Locale.from('en-US'), handle: 'mug' });

        // keyField addressing: the read keys on the SAME shopify handle the contract
        // froze — the natural key the goldens pin — never a backend document id.
        expect(result).toBe(meta);
        expect(queries).toEqual([
            {
                name: 'cms/read:productMetadataByHandle',
                args: { shopId: 'mock-shop-id', handle: 'mug', locale: 'en-US' },
            },
        ]);
    });

    it('preserves null-on-missing so the Shopify product page renders without an overlay', async () => {
        installQuery(null);
        expect(await ProductMetadataApi({ shop: mockShop(), locale: Locale.from('en-US'), handle: 'x' })).toBeNull();
    });
});

describe('CollectionMetadataApi — Convex-native (TEARDOWN-02 straight-line)', () => {
    it('resolves by the Shopify collection handle and serves the Convex overlay untouched', async () => {
        const meta = mockCollectionMetadata({ shopifyHandle: 'bestsellers' });
        const { queries } = installQuery(meta);

        const result = await CollectionMetadataApi({
            shop: mockShop(),
            locale: Locale.from('en-US'),
            handle: 'bestsellers',
        });

        expect(result).toBe(meta);
        expect(queries).toEqual([
            {
                name: 'cms/read:collectionMetadataByHandle',
                args: { shopId: 'mock-shop-id', handle: 'bestsellers', locale: 'en-US' },
            },
        ]);
    });

    it('preserves null-on-missing so the Shopify collection page renders without an overlay', async () => {
        installQuery(null);
        expect(await CollectionMetadataApi({ shop: mockShop(), locale: Locale.from('en-US'), handle: 'x' })).toBeNull();
    });
});

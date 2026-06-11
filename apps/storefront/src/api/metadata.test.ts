import { getCollectionMetadata, getProductMetadata } from '@nordcom/commerce-cms/api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockCollectionMetadata, mockProductMetadata, mockShop } from '@/utils/test/fixtures';
import { __setCmsShadowTransport, type CmsShadowTransport, flushCmsShadows } from './_cms-shadow';
import { CollectionMetadataApi, ProductMetadataApi } from './metadata';

vi.mock('@nordcom/commerce-cms/api', async () => {
    const actual = await vi.importActual<typeof import('@nordcom/commerce-cms/api')>('@nordcom/commerce-cms/api');
    return { ...actual, getProductMetadata: vi.fn(), getCollectionMetadata: vi.fn() };
});

/**
 * Installs a capturing shadow transport whose query resolves with the supplied value.
 *
 * @param value - The value every Convex query resolves with.
 * @returns The captured query invocations.
 */
function installTransport(value: unknown): { queries: Array<{ name: string; args: Record<string, unknown> }> } {
    const queries: Array<{ name: string; args: Record<string, unknown> }> = [];
    const transport: CmsShadowTransport = {
        query: (name, args) => {
            queries.push({ name, args });
            return Promise.resolve(value);
        },
        mutation: () => Promise.resolve(null),
    };
    __setCmsShadowTransport(transport);
    return { queries };
}

afterEach(async () => {
    await flushCmsShadows();
    __setCmsShadowTransport(null);
    delete process.env.CMS_READ_FLIP;
    vi.mocked(getProductMetadata).mockReset();
    vi.mocked(getCollectionMetadata).mockReset();
});

describe('ProductMetadataApi — Convex-native default (CUTOVER-05)', () => {
    it('resolves by the Shopify product handle and serves the Convex overlay untouched', async () => {
        const meta = mockProductMetadata({ shopifyHandle: 'mug' });
        const { queries } = installTransport(meta);

        const result = await ProductMetadataApi({ shop: mockShop(), locale: Locale.from('en-US'), handle: 'mug' });

        // keyField addressing: the flipped read keys on the SAME shopify handle the Mongo
        // getter queried — the natural key the goldens pin — never a backend document id.
        expect(result).toBe(meta);
        expect(queries).toEqual([
            {
                name: 'cms/read:productMetadataByHandle',
                args: { shopId: 'mock-shop-id', handle: 'mug', locale: 'en-US' },
            },
        ]);
        expect(getProductMetadata).not.toHaveBeenCalled();
    });

    it('preserves null-on-missing so the Shopify product page renders without an overlay', async () => {
        installTransport(null);
        expect(await ProductMetadataApi({ shop: mockShop(), locale: Locale.from('en-US'), handle: 'x' })).toBeNull();
        expect(getProductMetadata).not.toHaveBeenCalled();
    });
});

describe('CollectionMetadataApi — Convex-native default (CUTOVER-05)', () => {
    it('resolves by the Shopify collection handle and serves the Convex overlay untouched', async () => {
        const meta = mockCollectionMetadata({ shopifyHandle: 'bestsellers' });
        const { queries } = installTransport(meta);

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
        expect(getCollectionMetadata).not.toHaveBeenCalled();
    });
});

describe('metadata getters — emergency-shadow (`-getter` serves the Mongo snapshot)', () => {
    it('ProductMetadataApi queries Payload by shopifyHandle', async () => {
        process.env.CMS_READ_FLIP = '-productMetadata';
        vi.mocked(getProductMetadata).mockResolvedValue(mockProductMetadata());
        await ProductMetadataApi({ shop: mockShop(), locale: Locale.from('en-US'), handle: 'mug' });
        expect(getProductMetadata).toHaveBeenCalledWith(expect.objectContaining({ shopifyHandle: 'mug' }));
    });

    it('ProductMetadataApi returns null on miss', async () => {
        process.env.CMS_READ_FLIP = '-productMetadata';
        vi.mocked(getProductMetadata).mockResolvedValue(null as never);
        expect(await ProductMetadataApi({ shop: mockShop(), locale: Locale.from('en-US'), handle: 'x' })).toBeNull();
    });

    it('CollectionMetadataApi queries Payload by shopifyHandle', async () => {
        process.env.CMS_READ_FLIP = '-collectionMetadata';
        vi.mocked(getCollectionMetadata).mockResolvedValue(mockCollectionMetadata());
        await CollectionMetadataApi({ shop: mockShop(), locale: Locale.from('en-US'), handle: 'bestsellers' });
        expect(getCollectionMetadata).toHaveBeenCalledWith(expect.objectContaining({ shopifyHandle: 'bestsellers' }));
    });
});

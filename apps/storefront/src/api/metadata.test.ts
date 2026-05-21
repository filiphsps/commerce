import { getCollectionMetadata, getProductMetadata } from '@nordcom/commerce-cms/api';
import { describe, expect, it, vi } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockCollectionMetadata, mockProductMetadata, mockShop } from '@/utils/test/fixtures';
import { CollectionMetadataApi, ProductMetadataApi } from './metadata';

vi.mock('@nordcom/commerce-cms/api', async () => {
    const actual = await vi.importActual<typeof import('@nordcom/commerce-cms/api')>('@nordcom/commerce-cms/api');
    return { ...actual, getProductMetadata: vi.fn(), getCollectionMetadata: vi.fn() };
});

describe('ProductMetadataApi', () => {
    it('queries by shopifyHandle', async () => {
        vi.mocked(getProductMetadata).mockResolvedValue(mockProductMetadata());
        await ProductMetadataApi({ shop: mockShop(), locale: Locale.from('en-US'), handle: 'mug' });
        expect(getProductMetadata).toHaveBeenCalledWith(expect.objectContaining({ shopifyHandle: 'mug' }));
    });

    it('returns null on miss', async () => {
        vi.mocked(getProductMetadata).mockResolvedValue(null as never);
        expect(await ProductMetadataApi({ shop: mockShop(), locale: Locale.from('en-US'), handle: 'x' })).toBeNull();
    });
});

describe('CollectionMetadataApi', () => {
    it('queries by shopifyHandle', async () => {
        vi.mocked(getCollectionMetadata).mockResolvedValue(mockCollectionMetadata());
        await CollectionMetadataApi({ shop: mockShop(), locale: Locale.from('en-US'), handle: 'bestsellers' });
        expect(getCollectionMetadata).toHaveBeenCalledWith(expect.objectContaining({ shopifyHandle: 'bestsellers' }));
    });
});

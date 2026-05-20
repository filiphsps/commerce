import { getCollectionMetadata, getProductMetadata } from '@nordcom/commerce-cms/api';
import { draftMode } from 'next/headers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockCollectionMetadata, mockProductMetadata, mockShop } from '@/utils/test/fixtures';
import { CollectionMetadataApi, ProductMetadataApi } from './metadata';

vi.mock('next/headers', () => ({ draftMode: vi.fn() }));
vi.mock('@nordcom/commerce-cms/api', async () => {
    const actual = await vi.importActual<typeof import('@nordcom/commerce-cms/api')>('@nordcom/commerce-cms/api');
    return { ...actual, getProductMetadata: vi.fn(), getCollectionMetadata: vi.fn() };
});

describe('ProductMetadataApi', () => {
    beforeEach(() => {
        vi.mocked(draftMode).mockResolvedValue({ isEnabled: false } as never);
    });

    it('queries by shopifyHandle and forwards draft state', async () => {
        vi.mocked(getProductMetadata).mockResolvedValue(mockProductMetadata());
        await ProductMetadataApi({ shop: mockShop(), locale: Locale.from('en-US'), handle: 'mug' });
        expect(getProductMetadata).toHaveBeenCalledWith(
            expect.objectContaining({ shopifyHandle: 'mug', draft: false }),
        );
    });

    it('returns null on miss', async () => {
        vi.mocked(getProductMetadata).mockResolvedValue(null as never);
        expect(await ProductMetadataApi({ shop: mockShop(), locale: Locale.from('en-US'), handle: 'x' })).toBeNull();
    });
});

describe('CollectionMetadataApi', () => {
    beforeEach(() => {
        vi.mocked(draftMode).mockResolvedValue({ isEnabled: false } as never);
    });

    it('queries by shopifyHandle and forwards draft state', async () => {
        vi.mocked(getCollectionMetadata).mockResolvedValue(mockCollectionMetadata());
        await CollectionMetadataApi({ shop: mockShop(), locale: Locale.from('en-US'), handle: 'bestsellers' });
        expect(getCollectionMetadata).toHaveBeenCalledWith(
            expect.objectContaining({ shopifyHandle: 'bestsellers', draft: false }),
        );
    });
});

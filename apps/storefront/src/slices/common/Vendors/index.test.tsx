import { describe, expect, it, vi } from 'vitest';
import { mockLocale } from '@/utils/test/fixtures/locale';
import { vendorsFixture } from '@/utils/test/fixtures/prismic/vendors';
import { mockShop } from '@/utils/test/fixtures/shop';
import { renderRSC } from '@/utils/test/rsc';
import VendorsSlice from './index';

// Mock the Vendors component which depends on ShopifyApolloApiClient and VendorsApi
vi.mock('@/components/informational/vendors', () => ({
    default: vi.fn().mockReturnValue(null),
}));

describe('slices/common/Vendors', () => {
    it('renders section wrapper without throwing', async () => {
        const slice = vendorsFixture();
        const shop = mockShop();
        const locale = mockLocale();
        await expect(
            renderRSC(() => VendorsSlice({ slice, context: { shop, locale }, slices: [slice], index: 0 })),
        ).resolves.toBeDefined();
    });

    it('renders section with correct data-slice-type', async () => {
        const slice = vendorsFixture();
        const shop = mockShop();
        const locale = mockLocale();
        const result = await renderRSC(() =>
            VendorsSlice({ slice, context: { shop, locale }, slices: [slice], index: 0 }),
        );
        expect(result.container.querySelector('[data-slice-type="vendors"]')).toBeTruthy();
    });
});

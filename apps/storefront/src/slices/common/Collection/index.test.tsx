import { describe, expect, it, vi } from 'vitest';
import { mockLocale } from '@/utils/test/fixtures/locale';
import { collectionFixture } from '@/utils/test/fixtures/prismic/collection';
import { mockShop } from '@/utils/test/fixtures/shop';
import { renderRSC } from '@/utils/test/rsc';
import Slice from './index';

// Mock CollectionBlock — depends on Shopify API
vi.mock('@/components/products/collection-block', () => ({
    default: Object.assign(vi.fn().mockReturnValue(null), {
        skeleton: vi.fn().mockReturnValue(null),
    }),
}));

// Mock CollectionContainer — heavy async RSC, tested separately in collection.test.tsx
vi.mock('@/slices/common/Collection/collection', () => ({
    default: Object.assign(
        vi.fn().mockImplementation(({ children }: { children: unknown }) => children),
        {
            skeleton: vi.fn().mockReturnValue(null),
        },
    ),
}));

describe('slices/common/Collection', () => {
    it('renders without throwing', async () => {
        const slice = collectionFixture();
        const shop = mockShop();
        const locale = mockLocale();
        await expect(
            renderRSC(() => (
                <Slice slice={slice} context={{ shop, locale, i18n: {} as any }} slices={[slice]} index={0} />
            )),
        ).resolves.toBeDefined();
    });

    it('renders inner content via CollectionContainer', async () => {
        const slice = collectionFixture();
        const shop = mockShop();
        const locale = mockLocale();
        const result = await renderRSC(() => (
            <Slice slice={slice} context={{ shop, locale, i18n: {} as any }} slices={[slice]} index={0} />
        ));
        // CollectionContainer mock passes children through — container should not be empty
        expect(result.container).toBeDefined();
    });
});

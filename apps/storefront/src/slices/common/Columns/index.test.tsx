import { describe, expect, it, vi } from 'vitest';
import { mockLocale } from '@/utils/test/fixtures/locale';
import { columnsFixture } from '@/utils/test/fixtures/prismic/columns';
import { mockShop } from '@/utils/test/fixtures/shop';
import { renderRSC } from '@/utils/test/rsc';
import Columns from './index';

// Mock Prismic page component
vi.mock('@/components/cms/prismic-page', () => ({
    default: vi.fn().mockReturnValue(null),
}));

// createClient is already mocked globally in vitest.setup.ts via @/prismic,
// but Columns imports from @/utils/prismic. Mock that too.
vi.mock('@/utils/prismic', () => ({
    createClient: vi.fn().mockReturnValue({
        getByUID: vi.fn().mockResolvedValue({ data: { slices: [] } }),
    }),
    linkResolver: vi.fn().mockReturnValue('/'),
}));

describe('slices/common/Columns', () => {
    it('renders without throwing when children list is empty', async () => {
        const slice = columnsFixture({ children: [] });
        const shop = mockShop();
        const locale = mockLocale();
        await expect(
            renderRSC(() => Columns({ slice, context: { shop, locale }, slices: [slice], index: 0 })),
        ).resolves.toBeDefined();
    });

    it('renders with correct data-slice-type attribute', async () => {
        const slice = columnsFixture({ children: [] });
        const shop = mockShop();
        const locale = mockLocale();
        const result = await renderRSC(() => Columns({ slice, context: { shop, locale }, slices: [slice], index: 0 }));
        expect(result.container.querySelector('[data-slice-type="columns"]')).toBeTruthy();
    });
});

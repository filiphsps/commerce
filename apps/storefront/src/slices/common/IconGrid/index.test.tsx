import { describe, expect, it } from 'vitest';
import { mockLocale } from '@/utils/test/fixtures/locale';
import { iconGridFixture } from '@/utils/test/fixtures/prismic/icon-grid';
import { mockShop } from '@/utils/test/fixtures/shop';
import { renderRSC } from '@/utils/test/rsc';
import Slice from './index';

describe('slices/common/IconGrid', () => {
    it('renders without throwing', async () => {
        const slice = iconGridFixture();
        const shop = mockShop();
        const locale = mockLocale();
        await expect(
            renderRSC(() => <Slice slice={slice} context={{ shop, locale, i18n: {} as any }} slices={[]} index={0} />),
        ).resolves.toBeDefined();
    });

    it('renders items with text', async () => {
        const slice = iconGridFixture();
        const shop = mockShop();
        const locale = mockLocale();
        const result = await renderRSC(() => (
            <Slice slice={slice} context={{ shop, locale, i18n: {} as any }} slices={[]} index={0} />
        ));
        expect(result.getByText('Free Shipping')).toBeTruthy();
        expect(result.getByText('No Icon Item')).toBeTruthy();
    });

    it('returns null when items list is empty', async () => {
        const slice = { ...iconGridFixture(), items: [] };
        const shop = mockShop();
        const locale = mockLocale();
        const result = await renderRSC(() => (
            <Slice slice={slice} context={{ shop, locale, i18n: {} as any }} slices={[]} index={0} />
        ));
        expect(result.container.querySelector('section')).toBeNull();
    });
});

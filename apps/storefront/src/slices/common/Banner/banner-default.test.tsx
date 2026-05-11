import { describe, expect, it } from 'vitest';
import { bannerDefaultFixture } from '@/utils/test/fixtures/prismic/banner';
import { renderRSC } from '@/utils/test/rsc';
import { BannerDefault } from './banner-default';

describe('slices/common/Banner/BannerDefault', () => {
    it('renders without throwing', async () => {
        const slice = bannerDefaultFixture();
        await expect(renderRSC(() => <BannerDefault slice={slice} />)).resolves.toBeDefined();
    });

    it('renders section with data-slice-variation', async () => {
        const slice = bannerDefaultFixture();
        const result = await renderRSC(() => <BannerDefault slice={slice} />);
        expect(result.container.querySelector('[data-slice-variation="default"]')).toBeTruthy();
    });

    it('renders with items containing links', async () => {
        const slice = bannerDefaultFixture();
        slice.items = [
            {
                title: [{ type: 'paragraph', text: 'Shop Now', spans: [] }],
                target: { link_type: 'Web', url: 'https://example.com' },
                type: false,
            } as any,
        ];
        await expect(renderRSC(() => <BannerDefault slice={slice} />)).resolves.toBeDefined();
    });
});

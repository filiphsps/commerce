import { describe, expect, it } from 'vitest';
import { bannerAsideFixture } from '@/utils/test/fixtures/prismic/banner';
import { renderRSC } from '@/utils/test/rsc';
import { BannerAside } from './banner-aside';

describe('slices/common/Banner/BannerAside', () => {
    it('renders without throwing', async () => {
        const slice = bannerAsideFixture();
        await expect(renderRSC(() => <BannerAside slice={slice} index={0} />)).resolves.toBeDefined();
    });

    it('renders section with data-slice-variation="aside"', async () => {
        const slice = bannerAsideFixture();
        const result = await renderRSC(() => <BannerAside slice={slice} index={0} />);
        expect(result.container.querySelector('[data-slice-variation="aside"]')).toBeTruthy();
    });

    it('renders with priority=true when index < 2', async () => {
        const slice = bannerAsideFixture();
        const result = await renderRSC(() => <BannerAside slice={slice} index={0} />);
        expect(result.container.querySelector('section')).toBeTruthy();
    });
});

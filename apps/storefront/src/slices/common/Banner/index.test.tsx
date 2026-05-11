import { describe, expect, it } from 'vitest';
import { bannerAsideFixture, bannerDefaultFixture, bannerFixture } from '@/utils/test/fixtures/prismic/banner';
import { renderRSC } from '@/utils/test/rsc';
import Slice from './index';

describe('slices/common/Banner', () => {
    it('renders default variation without throwing', async () => {
        const slice = bannerFixture();
        await expect(
            renderRSC(() => <Slice slice={slice} context={{}} slices={[slice]} index={0} />),
        ).resolves.toBeDefined();
    });

    it('renders default variation with correct data-slice-variation', async () => {
        const slice = bannerDefaultFixture();
        const result = await renderRSC(() => <Slice slice={slice} context={{}} slices={[slice]} index={0} />);
        expect(result.container.querySelector('[data-slice-variation="default"]')).toBeTruthy();
    });

    it('renders aside variation without throwing', async () => {
        const slice = bannerAsideFixture();
        const result = await renderRSC(() => <Slice slice={slice} context={{}} slices={[slice]} index={0} />);
        expect(result.container.querySelector('[data-slice-variation="aside"]')).toBeTruthy();
    });

    it('renders aside with empty items list', async () => {
        const slice = bannerAsideFixture();
        // Items is already empty in the fixture; verify section still renders
        const result = await renderRSC(() => <Slice slice={slice} context={{}} slices={[slice]} index={0} />);
        expect(result.container.querySelector('section')).toBeTruthy();
    });
});

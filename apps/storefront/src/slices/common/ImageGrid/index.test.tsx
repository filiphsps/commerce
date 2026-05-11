import { describe, expect, it } from 'vitest';
import { imageGridEmptyFixture, imageGridFixture } from '@/utils/test/fixtures/prismic/image-grid';
import { renderRSC } from '@/utils/test/rsc';
import Slice from './index';

describe('slices/common/ImageGrid', () => {
    it('renders without throwing', async () => {
        const slice = imageGridFixture();
        await expect(
            renderRSC(() => <Slice slice={slice} context={{}} slices={[slice]} index={0} />),
        ).resolves.toBeDefined();
    });

    it('renders section with data-slice-type attribute', async () => {
        const slice = imageGridFixture();
        const result = await renderRSC(() => <Slice slice={slice} context={{}} slices={[slice]} index={0} />);
        expect(result.container.querySelector('[data-slice-type="image_grid"]')).toBeTruthy();
    });

    it('returns null when items list is empty', async () => {
        const slice = imageGridEmptyFixture();
        const result = await renderRSC(() => <Slice slice={slice} context={{}} slices={[slice]} index={0} />);
        expect(result.container.querySelector('section')).toBeNull();
    });
});

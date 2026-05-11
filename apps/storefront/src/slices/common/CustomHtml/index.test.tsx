import { describe, expect, it } from 'vitest';
import { customHtmlFixture } from '@/utils/test/fixtures/prismic/custom-html';
import { renderRSC } from '@/utils/test/rsc';
import Slice from './index';

describe('slices/common/CustomHtml', () => {
    it('renders without throwing', async () => {
        const slice = customHtmlFixture();
        await expect(
            renderRSC(() => <Slice slice={slice} context={{}} slices={[slice]} index={0} />),
        ).resolves.toBeDefined();
    });

    it('renders the custom HTML content', async () => {
        const slice = customHtmlFixture({ html: '<span data-testid="custom-content">Hello Custom HTML</span>' });
        const result = await renderRSC(() => <Slice slice={slice} context={{}} slices={[slice]} index={0} />);
        expect(result.container.querySelector('[data-slice-type="custom_html"]')).toBeTruthy();
    });

    it('renders with null html gracefully', async () => {
        const slice = customHtmlFixture({ html: null });
        await expect(
            renderRSC(() => <Slice slice={slice} context={{}} slices={[slice]} index={0} />),
        ).resolves.toBeDefined();
    });
});

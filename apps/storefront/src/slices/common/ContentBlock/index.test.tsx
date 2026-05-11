import { describe, expect, it } from 'vitest';
import { contentBlockCardFixture, contentBlockFixture } from '@/utils/test/fixtures/prismic/content-block';
import { renderRSC } from '@/utils/test/rsc';
import Slice from './index';

describe('slices/common/ContentBlock', () => {
    it('renders default variation without throwing', async () => {
        const slice = contentBlockFixture();
        await expect(
            renderRSC(() => <Slice slice={slice} context={{}} slices={[slice]} index={0} />),
        ).resolves.toBeDefined();
    });

    it('renders default variation with data-slice-type', async () => {
        const slice = contentBlockFixture();
        const result = await renderRSC(() => <Slice slice={slice} context={{}} slices={[slice]} index={0} />);
        expect(result.container.querySelector('[data-slice-type="content_block"]')).toBeTruthy();
    });

    it('renders card variation without throwing', async () => {
        const slice = contentBlockCardFixture();
        await expect(
            renderRSC(() => <Slice slice={slice} context={{}} slices={[slice]} index={0} />),
        ).resolves.toBeDefined();
    });

    it('renders card variation with card text content', async () => {
        const slice = contentBlockCardFixture();
        const result = await renderRSC(() => <Slice slice={slice} context={{}} slices={[slice]} index={0} />);
        // Card variation renders a div with prose content (Card component doesn't forward data attrs)
        expect(result.container.querySelector('.prose')).toBeTruthy();
    });
});

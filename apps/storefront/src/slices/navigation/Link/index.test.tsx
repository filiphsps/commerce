import { describe, expect, it } from 'vitest';
import { linkFixture, linkHighlightedFixture } from '@/utils/test/fixtures/prismic/link';
import { renderRSC } from '@/utils/test/rsc';
import Slice from './index';

describe('slices/navigation/Link', () => {
    it('renders without throwing when isHeader is true', async () => {
        const slice = linkFixture();
        await expect(
            renderRSC(() => <Slice slice={slice} context={{ isHeader: true }} slices={[slice]} index={0} />),
        ).resolves.toBeDefined();
    });

    it('returns null when isHeader is false', async () => {
        const slice = linkFixture();
        const result = await renderRSC(() => (
            <Slice slice={slice} context={{ isHeader: false }} slices={[slice]} index={0} />
        ));
        expect(result.container.firstChild).toBeNull();
    });

    it('renders highlighted variant without throwing', async () => {
        const slice = linkHighlightedFixture();
        await expect(
            renderRSC(() => <Slice slice={slice} context={{ isHeader: true }} slices={[slice]} index={0} />),
        ).resolves.toBeDefined();
    });
});

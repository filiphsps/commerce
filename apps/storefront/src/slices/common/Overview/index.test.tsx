import { describe, expect, it } from 'vitest';
import { overviewEmptyFixture, overviewFixture } from '@/utils/test/fixtures/prismic/overview';
import { renderRSC } from '@/utils/test/rsc';
import Slice from './index';

describe('slices/common/Overview', () => {
    it('renders without throwing', async () => {
        const slice = overviewFixture();
        await expect(
            renderRSC(() => <Slice slice={slice} context={{}} slices={[slice]} index={0} />),
        ).resolves.toBeDefined();
    });

    it('renders section when items are present', async () => {
        const slice = overviewFixture();
        const result = await renderRSC(() => <Slice slice={slice} context={{}} slices={[slice]} index={0} />);
        expect(result.container.querySelector('section')).toBeTruthy();
    });

    it('returns null when items list is empty', async () => {
        const slice = overviewEmptyFixture();
        const result = await renderRSC(() => <Slice slice={slice} context={{}} slices={[slice]} index={0} />);
        expect(result.container.firstChild).toBeNull();
    });
});

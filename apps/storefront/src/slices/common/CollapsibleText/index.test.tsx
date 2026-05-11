import { describe, expect, it } from 'vitest';
import { collapsibleTextFixture } from '@/utils/test/fixtures/prismic/collapsible-text';
import { renderRSC } from '@/utils/test/rsc';
import Slice from './index';

describe('slices/common/CollapsibleText', () => {
    it('renders without throwing', async () => {
        const slice = collapsibleTextFixture();
        await expect(
            renderRSC(() => <Slice slice={slice} context={{}} slices={[slice]} index={0} />),
        ).resolves.toBeDefined();
    });

    it('renders the title text', async () => {
        const slice = collapsibleTextFixture({ title: 'My FAQ Question' });
        const result = await renderRSC(() => <Slice slice={slice} context={{}} slices={[slice]} index={0} />);
        expect(result.getByText('My FAQ Question')).toBeTruthy();
    });

    it('renders with empty text gracefully', async () => {
        const slice = collapsibleTextFixture({ text: [] });
        await expect(
            renderRSC(() => <Slice slice={slice} context={{}} slices={[slice]} index={0} />),
        ).resolves.toBeDefined();
    });
});

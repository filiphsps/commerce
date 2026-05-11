import { describe, expect, it } from 'vitest';
import { alertFixture } from '@/utils/test/fixtures/prismic/alert';
import { renderRSC } from '@/utils/test/rsc';
import Slice from './index';

describe('slices/common/Alert', () => {
    it('renders without throwing', async () => {
        const slice = alertFixture();
        await expect(
            renderRSC(() => <Slice slice={slice} context={{}} slices={[slice]} index={0} />),
        ).resolves.toBeDefined();
    });

    it('renders with a callout severity', async () => {
        const slice = alertFixture({
            primary: {
                severity: 'callout',
                content: [{ type: 'paragraph', text: 'Callout message', spans: [] }],
                show_icon: false,
            },
        });
        const result = await renderRSC(() => <Slice slice={slice} context={{}} slices={[slice]} index={0} />);
        expect(result.container.querySelector('[data-severity="callout"]')).toBeTruthy();
    });

    it('renders with empty content gracefully', async () => {
        const slice = alertFixture({ primary: { content: [], show_icon: false } });
        await expect(
            renderRSC(() => <Slice slice={slice} context={{}} slices={[slice]} index={0} />),
        ).resolves.toBeDefined();
    });
});

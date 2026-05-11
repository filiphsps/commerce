import { describe, expect, it } from 'vitest';
import { collectionFixture } from '@/utils/test/fixtures/prismic/collection';
import { renderRSC } from '@/utils/test/rsc';
import CollectionContainer from './collection';

describe('slices/common/Collection/CollectionContainer', () => {
    it('renders without throwing', async () => {
        const slice = collectionFixture();
        await expect(
            renderRSC(() => CollectionContainer({ slice: slice as any, children: <div>test</div> })),
        ).resolves.toBeDefined();
    });

    it('renders section with data-slice-type attribute when children provided', async () => {
        const slice = collectionFixture();
        const result = await renderRSC(() => CollectionContainer({ slice: slice as any, children: <div>child</div> }));
        expect(result.container.querySelector('[data-slice-type="collection"]')).toBeTruthy();
    });

    it('renders with title and body when present', async () => {
        const slice = collectionFixture({
            handle: 'test-collection',
            title: [{ type: 'heading1', text: 'Test Title', spans: [] }],
        });
        await expect(
            renderRSC(() => CollectionContainer({ slice: slice as any, children: <div>test</div> })),
        ).resolves.toBeDefined();
    });

    it('does not render header when no handle is set', async () => {
        const slice = collectionFixture({ handle: null });
        const result = await renderRSC(() => CollectionContainer({ slice: slice as any, children: <div>test</div> }));
        // No h1/h2 heading when handle is absent
        expect(result.container.querySelector('header')).toBeNull();
    });
});

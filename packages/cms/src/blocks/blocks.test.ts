import { describe, expect, it } from 'vitest';
import { columnsBlock } from './columns';
import {
    alertBlock,
    allBlocks,
    BLOCK_TYPES,
    type BlockType,
    bannerBlock,
    blockSlugs,
    collectionBlock,
    htmlBlock,
    mediaGridBlock,
    overviewBlock,
    richTextBlock,
    vendorsBlock,
} from './index';

/**
 * Exhaustive map from every {@link BlockType} to its block definition.
 *
 * The `satisfies Record<BlockType, …>` is editor-time/documentation only — it is
 * NOT a CI gate. Test files (`*.test.*`) are excluded from the build typecheck
 * by `tsconfig.lib.json`, inherited by the cms tsconfig, and `vitest run` does
 * not typecheck — so the constraint surfaces a missing member only in an editor,
 * never in CI.
 *
 * Within this test, drift is caught at RUNTIME by the `wires every block type…`
 * loop: a `BLOCK_TYPES` member with no entry here resolves to `undefined`, so
 * reading `.slug` throws and the test fails.
 *
 * The CI-enforced, compile-time exhaustiveness guard lives in a non-test source
 * file inside the build typecheck set: `CMS_BLOCKS: Record<BlockType,
 * CmsBlockEntry>` in `blocks/render/registry.tsx`. Adding a `BlockType` without
 * a `CMS_BLOCKS` entry fails `tsc --noEmit`.
 */
const blockByType = {
    columns: columnsBlock,
    alert: alertBlock,
    banner: bannerBlock,
    collection: collectionBlock,
    html: htmlBlock,
    'media-grid': mediaGridBlock,
    overview: overviewBlock,
    'rich-text': richTextBlock,
    vendors: vendorsBlock,
} satisfies Record<BlockType, { slug: string }>;

describe('block definitions', () => {
    it('exposes 9 blocks', () => {
        expect(allBlocks).toHaveLength(9);
    });

    it('has the expected slugs', () => {
        expect(blockSlugs.sort()).toEqual(
            [
                'alert',
                'banner',
                'collection',
                'columns',
                'html',
                'media-grid',
                'overview',
                'rich-text',
                'vendors',
            ].sort(),
        );
    });

    it('every block has a fields array', () => {
        for (const block of allBlocks) {
            expect(Array.isArray(block.fields)).toBe(true);
            expect(block.fields.length).toBeGreaterThan(0);
        }
    });

    it('every block has a unique interfaceName', () => {
        const names = allBlocks.map((b) => b.interfaceName);
        expect(new Set(names).size).toBe(names.length);
    });
});

describe('block registry order & exhaustiveness', () => {
    // Freezes the canonical block-type order. The Payload block definitions, the
    // CMS `BlockRenderer`, and the storefront `Blocks` dispatcher all key off
    // this order; a reorder or insertion moves the snapshot and surfaces for
    // review.
    it('preserves the canonical BLOCK_TYPES order', () => {
        expect([...BLOCK_TYPES]).toMatchInlineSnapshot(`
          [
            "columns",
            "alert",
            "banner",
            "collection",
            "html",
            "media-grid",
            "overview",
            "rich-text",
            "vendors",
          ]
        `);
    });

    it('registers allBlocks in BLOCK_TYPES order', () => {
        expect(allBlocks.map((b) => b.slug)).toEqual([...BLOCK_TYPES]);
    });

    it('wires every block type to a definition whose slug matches its key', () => {
        for (const type of BLOCK_TYPES) {
            expect(blockByType[type].slug).toBe(type);
        }
    });
});

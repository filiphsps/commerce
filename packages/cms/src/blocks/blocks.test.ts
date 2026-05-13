import { describe, expect, it } from 'vitest';
import { allBlocks, blockSlugs } from './index';

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

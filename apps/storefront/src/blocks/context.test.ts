import { describe, expect, it } from 'vitest';

import { type BlockContext, cmsFieldAttrs } from './context';

/**
 * A minimal {@link BlockContext}; `shop`/`locale` are irrelevant to the
 * preview-attribute gating under test, so they're cast in rather than built.
 */
const baseContext = (overrides: Partial<BlockContext>): BlockContext =>
    ({ shop: {}, locale: {}, ...overrides }) as BlockContext;

describe('cmsFieldAttrs — preview-only data-cms-field gating', () => {
    it('emits the dotted field path for a top-level block in preview', () => {
        expect(cmsFieldAttrs(baseContext({ preview: true, path: 'blocks' }), 2, 'heading')).toEqual({
            'data-cms-field': 'blocks.2.heading',
        });
    });

    it('treats an absent depth as top-level (0)', () => {
        expect(cmsFieldAttrs(baseContext({ preview: true, path: 'blocks', depth: 0 }), 0, 'title')).toEqual({
            'data-cms-field': 'blocks.0.title',
        });
    });

    it('emits NOTHING for a normal (non-preview) render — zero storefront footprint', () => {
        expect(cmsFieldAttrs(baseContext({ path: 'blocks' }), 0, 'heading')).toEqual({});
        expect(cmsFieldAttrs(baseContext({ preview: false, path: 'blocks' }), 0, 'heading')).toEqual({});
    });

    it('emits nothing without a known blocks path', () => {
        expect(cmsFieldAttrs(baseContext({ preview: true }), 0, 'heading')).toEqual({});
    });

    it('emits nothing for nested blocks (depth > 0), which reconcile via refresh', () => {
        expect(cmsFieldAttrs(baseContext({ preview: true, path: 'blocks', depth: 1 }), 0, 'heading')).toEqual({});
    });
});

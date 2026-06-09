import { BLOCK_TYPES, type BlockType, resolveBlockType } from '@nordcom/commerce-cms/blocks';
import { TypeError as CommerceTypeError } from '@nordcom/commerce-errors';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Blocks } from './blocks';
import type { BlockContext } from './context';
import { STOREFRONT_BLOCKS } from './registry';
import type { BlockNode } from './types';

// Stub anything that boots the Next router / Apollo / Shopify so the registry's
// routing is what's under test, not each leaf block's data layer (those are
// pinned by the per-block tests).
vi.mock('@/components/link', () => ({
    default: ({ children, ...rest }: { children: React.ReactNode }) => <a {...rest}>{children}</a>,
}));
vi.mock('@/components/products/collection-block', () => ({
    default: Object.assign(() => <div data-testid="collection-stub" />, {
        skeleton: () => <div data-testid="collection-skeleton" />,
    }),
}));
vi.mock('@/components/informational/vendors', () => ({
    default: () => <div data-testid="vendors-stub" />,
}));

const shop = { id: 'shop-1', domain: 'shop.test', i18n: { defaultLocale: 'en-US' } } as never;
const locale = { code: 'en-US', country: 'US' } as never;
const ctx: BlockContext = { shop, locale };

// One minimal-but-valid node per canonical block type. Each renders a
// `data-block-type` marker, so the registry can be proven to route every type
// to a real component.
const SAMPLE_NODES: Record<BlockType, BlockNode> = {
    columns: {
        blockType: 'columns',
        columns: [{ width: 'auto', content: [{ blockType: 'alert', severity: 'info', title: 'nested' }] }],
    },
    alert: { blockType: 'alert', severity: 'info', title: 'Alert title' },
    banner: { blockType: 'banner', heading: 'Banner heading', alignment: 'center' },
    collection: { blockType: 'collection', handle: 'sample', layout: 'grid', limit: 8 },
    html: { blockType: 'html', html: '<em>raw</em>' },
    'media-grid': {
        blockType: 'media-grid',
        itemType: 'image',
        columns: 3,
        items: [{ image: { id: 'a', url: 'https://cdn.test/a.png', alt: 'a' }, caption: 'A' }],
    },
    overview: { blockType: 'overview', source: 'collection', collectionHandle: 'sample', limit: 8 },
    'rich-text': {
        blockType: 'rich-text',
        body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Rich body' }] }] },
    },
    vendors: { blockType: 'vendors', maxVendors: 8 },
};

describe('shared block registry', () => {
    it('registers a storefront entry for every canonical block type and nothing extra', () => {
        expect(Object.keys(STOREFRONT_BLOCKS).sort()).toEqual([...BLOCK_TYPES].sort());
        for (const type of BLOCK_TYPES) {
            const entry = STOREFRONT_BLOCKS[type];
            expect(typeof entry.render).toBe('function');
            expect(typeof entry.renderSkeleton).toBe('function');
        }
    });

    it('has a sample node for every block type (keeps this test exhaustive)', () => {
        expect(Object.keys(SAMPLE_NODES).sort()).toEqual([...BLOCK_TYPES].sort());
    });

    it('resolves + renders every existing block type through the live dispatcher', () => {
        for (const type of BLOCK_TYPES) {
            const { container } = render(<Blocks blocks={[SAMPLE_NODES[type]]} context={ctx} />);
            expect(container.querySelector(`[data-block-type="${type}"]`)).not.toBeNull();
        }
    });

    it('resolves + renders every existing block type through the skeleton dispatcher', () => {
        for (const type of BLOCK_TYPES) {
            const { container } = render(<Blocks.Skeleton blocks={[SAMPLE_NODES[type]]} context={ctx} />);
            expect(container.querySelector(`[data-block-type="${type}"]`)).not.toBeNull();
        }
    });

    it('renders unknown block types as null instead of throwing (graceful degradation preserved)', () => {
        const malformed = [{ blockType: 'future-unknown-block' } as unknown] as BlockNode[];
        const { container } = render(<Blocks blocks={malformed} context={ctx} />);
        expect(container.firstChild).toBeNull();
    });
});

describe('resolveBlockType', () => {
    it('returns the type for every known block type', () => {
        for (const type of BLOCK_TYPES) {
            expect(resolveBlockType(type)).toBe(type);
        }
    });

    it('throws a @nordcom/commerce-errors error carrying the block type for an unknown type', () => {
        expect(() => resolveBlockType('future-unknown-block')).toThrow(CommerceTypeError);
        try {
            resolveBlockType('future-unknown-block');
        } catch (error) {
            expect(error).toBeInstanceOf(CommerceTypeError);
            expect(String((error as CommerceTypeError).cause)).toContain('future-unknown-block');
        }
    });
});

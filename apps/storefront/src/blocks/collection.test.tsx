import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CollectionBlock } from './collection';
import type { BlockContext } from './context';
import type { CollectionBlockNode } from './types';

// Capture the `layout` prop handed to the inner grid component so we can assert
// how the block normalizes its stored `layout` into a responsive value.
vi.mock('@/components/products/collection-block', () => ({
    default: Object.assign(
        ({ layout }: { layout: unknown }) => <div data-testid="grid" data-layout={JSON.stringify(layout)} />,
        {
            skeleton: ({ layout }: { layout: unknown }) => (
                <div data-testid="grid-skeleton" data-layout={JSON.stringify(layout)} />
            ),
        },
    ),
}));
vi.mock('@/components/link', () => ({
    default: ({ children, ...rest }: { children: React.ReactNode }) => <a {...rest}>{children}</a>,
}));

const ctx: BlockContext = {
    shop: { id: 'shop-1', domain: 'shop.test', i18n: { defaultLocale: 'en-US' } } as never,
    locale: { code: 'en-US', country: 'US' } as never,
};

const renderBlock = (layout: CollectionBlockNode['layout']) => {
    const block = { blockType: 'collection', handle: 'sale', limit: 8, layout } as CollectionBlockNode;
    const { container } = render(<CollectionBlock block={block} context={ctx} />);
    const section = container.querySelector('[data-block-type="collection"]') as HTMLElement;
    const grid = container.querySelector('[data-testid="grid"]') as HTMLElement;
    return {
        summary: section.getAttribute('data-layout'),
        layout: JSON.parse(grid.getAttribute('data-layout') ?? 'null'),
    };
};

describe('CollectionBlock layout resolution', () => {
    it('defaults an unset layout to carousel on mobile, grid from tablet up', () => {
        const { summary, layout } = renderBlock(undefined);
        expect(layout).toEqual({ base: 'carousel', md: 'grid' });
        expect(summary).toBe('base:carousel md:grid');
    });

    it('upgrades legacy "grid" to the modern mobile-carousel default', () => {
        expect(renderBlock('grid').layout).toEqual({ base: 'carousel', md: 'grid' });
    });

    it('keeps legacy "carousel" as a carousel at every breakpoint', () => {
        const { summary, layout } = renderBlock('carousel');
        expect(layout).toEqual({ base: 'carousel' });
        expect(summary).toBe('base:carousel');
    });

    it('passes a responsive map through, normalized and ordered', () => {
        const { summary, layout } = renderBlock({ base: 'grid', lg: 'carousel' });
        expect(layout).toEqual({ base: 'grid', lg: 'carousel' });
        expect(summary).toBe('base:grid lg:carousel');
    });

    it('fills a missing base on a partial responsive map', () => {
        expect(renderBlock({ md: 'grid' } as never).layout).toEqual({ base: 'carousel', md: 'grid' });
    });
});

describe('CollectionBlock.Skeleton', () => {
    it('mirrors the resolved layout into the placeholder grid', () => {
        const block = { blockType: 'collection', handle: 'sale', limit: 8, layout: 'grid' } as CollectionBlockNode;
        const { container } = render(<CollectionBlock.Skeleton block={block} />);
        const grid = container.querySelector('[data-testid="grid-skeleton"]') as HTMLElement;
        expect(JSON.parse(grid.getAttribute('data-layout') ?? 'null')).toEqual({ base: 'carousel', md: 'grid' });
    });
});

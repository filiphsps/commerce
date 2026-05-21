import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Blocks } from './blocks';
import type { BlockContext } from './context';
import type { BlockNode } from './types';

// The dispatcher is a switch over `blockType` — the value here isn't the
// rendering quality of any individual block (that's pinned by each block's
// own test) but the routing + empty/null handling + the depth guard
// against malformed/nested CMS documents blowing the render stack.

// Stub anything that boots Next router / Apollo / etc. The dispatcher's
// behavior is independent of what the leaf blocks render — only that it
// reaches them.
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

describe('Blocks dispatcher', () => {
    it('renders nothing for null / empty arrays', () => {
        const { container: a } = render(<Blocks blocks={null} context={ctx} />);
        const { container: b } = render(<Blocks blocks={[]} context={ctx} />);
        expect(a.firstChild).toBeNull();
        expect(b.firstChild).toBeNull();
    });

    it('routes by blockType — alert', () => {
        const { container } = render(
            <Blocks
                blocks={[{ blockType: 'alert', severity: 'info', title: 'Heads up' }] as BlockNode[]}
                context={ctx}
            />,
        );
        expect(container.querySelector('[data-block-type="alert"]')).not.toBeNull();
        expect(container.textContent).toContain('Heads up');
    });

    it('routes by blockType — html', () => {
        const { container } = render(
            <Blocks blocks={[{ blockType: 'html', html: '<em>raw</em>' }] as BlockNode[]} context={ctx} />,
        );
        expect(container.querySelector('[data-block-type="html"]')?.innerHTML).toBe('<em>raw</em>');
    });

    it('routes by blockType — banner', () => {
        const { container } = render(
            <Blocks
                blocks={
                    [
                        {
                            blockType: 'banner',
                            heading: 'Hi',
                            alignment: 'center',
                        },
                    ] as BlockNode[]
                }
                context={ctx}
            />,
        );
        expect(container.querySelector('[data-block-type="banner"]')).not.toBeNull();
        expect(container.textContent).toContain('Hi');
    });

    it('routes by blockType — media-grid (skips items without image url)', () => {
        const { container } = render(
            <Blocks
                blocks={
                    [
                        {
                            blockType: 'media-grid',
                            itemType: 'image',
                            columns: 3,
                            items: [
                                { image: { id: 'x', url: 'https://cdn.test/a.png', alt: 'a' }, caption: 'A' },
                                { image: undefined as never, caption: 'no-image' },
                            ],
                        },
                    ] as BlockNode[]
                }
                context={ctx}
            />,
        );
        const section = container.querySelector('[data-block-type="media-grid"]');
        expect(section).not.toBeNull();
        // Only the item with a populated image url renders.
        expect(container.textContent).toContain('A');
        expect(container.textContent).not.toContain('no-image');
    });

    it('recurses into columns — nested blocks render through the same dispatcher', () => {
        const { container } = render(
            <Blocks
                blocks={
                    [
                        {
                            blockType: 'columns',
                            columns: [
                                {
                                    width: 'auto',
                                    content: [{ blockType: 'alert', severity: 'info', title: 'nested' }] as BlockNode[],
                                },
                            ],
                        },
                    ] as BlockNode[]
                }
                context={ctx}
            />,
        );
        expect(container.querySelector('[data-block-type="columns"]')).not.toBeNull();
        expect(container.querySelector('[data-block-type="alert"]')).not.toBeNull();
        expect(container.textContent).toContain('nested');
    });

    it("caps recursion at MAX_BLOCK_DEPTH so a malformed circular document can't blow the stack", () => {
        // Manually pre-set depth = 6 (the cap). Even a valid block should
        // render nothing because the dispatcher should have bailed.
        const { container } = render(
            <Blocks
                blocks={[{ blockType: 'alert', severity: 'info', title: 'should not show' }] as BlockNode[]}
                context={{ ...ctx, depth: 6 }}
            />,
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders unrecognised block types as nothing instead of throwing', () => {
        // Cast through unknown — TypeScript narrows the union and would
        // refuse a literal unknown blockType, but a future schema change
        // can land an unknown shape in production.
        const malformed = [{ blockType: 'future-unknown-block' } as unknown] as BlockNode[];
        const { container } = render(<Blocks blocks={malformed} context={ctx} />);
        expect(container.firstChild).toBeNull();
    });
});

describe('Blocks.Skeleton dispatcher', () => {
    it('renders nothing for null / empty arrays', () => {
        const { container: a } = render(<Blocks.Skeleton blocks={null} context={ctx} />);
        const { container: b } = render(<Blocks.Skeleton blocks={[]} context={ctx} />);
        expect(a.firstChild).toBeNull();
        expect(b.firstChild).toBeNull();
    });

    it('emits one skeleton per block, tagged with data-block-type for layout parity', () => {
        const { container } = render(
            <Blocks.Skeleton
                blocks={
                    [
                        { blockType: 'alert', severity: 'info', title: 't' },
                        { blockType: 'banner', heading: 'h', alignment: 'center' },
                        { blockType: 'rich-text', body: { root: { children: [] } } },
                    ] as BlockNode[]
                }
                context={ctx}
            />,
        );
        expect(container.querySelector('[data-block-type="alert"][data-skeleton-variant="alert"]')).not.toBeNull();
        expect(container.querySelector('[data-block-type="banner"][data-skeleton-variant="banner"]')).not.toBeNull();
        expect(
            container.querySelector('[data-block-type="rich-text"][data-skeleton-variant="rich-text"]'),
        ).not.toBeNull();
    });

    it('sizes media-grid skeleton to match the editor-configured item count', () => {
        const { container } = render(
            <Blocks.Skeleton
                blocks={
                    [
                        {
                            blockType: 'media-grid',
                            itemType: 'image',
                            columns: 3,
                            items: [
                                { image: { id: 'a', url: 'u' }, caption: 'A' },
                                { image: { id: 'b', url: 'u' }, caption: 'B' },
                                { image: { id: 'c', url: 'u' }, caption: 'C' },
                            ],
                        },
                    ] as BlockNode[]
                }
                context={ctx}
            />,
        );
        const tiles = container.querySelectorAll('[data-block-type="media-grid"] [data-skeleton]');
        // 3 tile placeholders + 3 caption placeholders = 6.
        expect(tiles.length).toBe(6);
    });

    it('recurses through columns — nested column content renders as skeletons, not live blocks', () => {
        const { container } = render(
            <Blocks.Skeleton
                blocks={
                    [
                        {
                            blockType: 'columns',
                            columns: [
                                {
                                    width: 'auto',
                                    content: [{ blockType: 'alert', severity: 'info', title: 'inner' }] as BlockNode[],
                                },
                            ],
                        },
                    ] as BlockNode[]
                }
                context={ctx}
            />,
        );
        // Outer columns + inner alert both carry the skeleton variant marker.
        expect(container.querySelector('[data-skeleton-variant="columns"]')).not.toBeNull();
        expect(container.querySelector('[data-skeleton-variant="alert"]')).not.toBeNull();
        // Live alert text must NOT leak through — recursion has to route to
        // skeleton blocks, not the real dispatcher.
        expect(container.textContent).not.toContain('inner');
    });

    it("respects the depth cap so a malformed circular document can't blow the stack", () => {
        const { container } = render(
            <Blocks.Skeleton
                blocks={[{ blockType: 'alert', severity: 'info', title: 'hi' }] as BlockNode[]}
                context={{ ...ctx, depth: 6 }}
            />,
        );
        expect(container.firstChild).toBeNull();
    });
});

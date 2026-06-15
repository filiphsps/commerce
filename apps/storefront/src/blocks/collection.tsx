import 'server-only';

import { normalizeResponsiveValue, responsiveEntries } from '@nordcom/commerce-cms/responsive';
import { Suspense } from 'react';
import CollectionBlockComponent, { type CollectionLayout } from '@/components/products/collection-block';
import { Title } from '@/components/typography/heading';
import { cn } from '@/utils/tailwind';
import type { BlockContext } from './context';
import type { CollectionBlockNode } from './types';

/** Layout applied when a block has none: a swipeable carousel on phones, a grid from tablets up. */
const DEFAULT_LAYOUT: CollectionLayout = { base: 'carousel', md: 'grid' };

/**
 * Coerces a stored collection `layout` (a responsive map, a legacy scalar, or
 * nothing) into a responsive value. Legacy `'grid'` adopts the modern default
 * (carousel on phones, grid on larger screens) so existing shops gain the mobile
 * carousel automatically; legacy `'carousel'` stays a carousel at every breakpoint.
 *
 * @param raw - The block's stored `layout`.
 * @returns The resolved responsive layout.
 */
const resolveBlockLayout = (raw: CollectionBlockNode['layout']): CollectionLayout => {
    if (raw == null) return DEFAULT_LAYOUT;
    if (typeof raw === 'string') return raw === 'carousel' ? { base: 'carousel' } : DEFAULT_LAYOUT;
    return normalizeResponsiveValue<'grid' | 'carousel'>(raw, 'carousel');
};

/**
 * A compact, test-friendly summary of a responsive layout, e.g. `base:carousel md:grid`.
 *
 * @param layout - The resolved responsive layout.
 * @returns The space-separated `breakpoint:value` summary.
 */
const layoutSummary = (layout: CollectionLayout): string =>
    responsiveEntries(layout)
        .map(([breakpoint, value]) => `${breakpoint}:${value}`)
        .join(' ');

/**
 * Renders the CMS Collection block. Delegates the product grid to the shared
 * `CollectionBlock` component (which talks to Shopify) and owns the title and
 * wrapper. `layout` is a per-breakpoint {@link CollectionLayout}; the title
 * streams statically while the inner grid resolves via its own Suspense.
 *
 * @param props.block - The collection block node (handle, layout, limit, title).
 * @param props.context - Block render context supplying shop and locale.
 * @param props.index - Block position, forwarded for image priority hints.
 * @returns The collection section.
 */
export const CollectionBlock = ({
    block,
    context,
    index = 0,
}: {
    block: CollectionBlockNode;
    context: BlockContext;
    /** Forwarded to the inner CollectionBlock for image priority hints. */
    index?: number;
}) => {
    const layout = resolveBlockLayout(block.layout);

    return (
        <section
            data-block-type="collection"
            data-layout={layoutSummary(layout)}
            className={cn('flex w-full flex-col items-start justify-start gap-4 self-start')}
        >
            {block.title ? (
                <Title as="h2" className="font-bold text-xl leading-tight lg:text-2xl">
                    {block.title}
                </Title>
            ) : null}

            <Suspense fallback={<CollectionBlockComponent.skeleton layout={layout} />}>
                <CollectionBlockComponent
                    shop={context.shop}
                    locale={context.locale}
                    handle={block.handle}
                    layout={layout}
                    limit={block.limit ?? 16}
                    priority={index < 3}
                    className="w-full"
                />
            </Suspense>
        </section>
    );
};

CollectionBlock.displayName = 'Nordcom.Blocks.Collection';

/**
 * Loading placeholder for the Collection block. Keeps the static title and
 * defers the product-grid placeholder to `CollectionBlock.skeleton`, which
 * mirrors the live grid's per-breakpoint layout and card size.
 *
 * @param props.block - The collection block node, read for its title and layout.
 * @returns The skeleton collection section.
 */
const CollectionBlockSkeleton = ({ block }: { block: CollectionBlockNode }) => {
    const layout = resolveBlockLayout(block.layout);
    return (
        <section
            data-block-type="collection"
            data-layout={layoutSummary(layout)}
            data-skeleton-variant="collection"
            className={cn('flex w-full flex-col items-start justify-start gap-4 self-start')}
        >
            {block.title ? <div className="h-7 w-48 rounded-sm lg:h-8" data-skeleton /> : null}
            <CollectionBlockComponent.skeleton layout={layout} />
        </section>
    );
};
CollectionBlockSkeleton.displayName = 'Nordcom.Blocks.Collection.Skeleton';
CollectionBlock.Skeleton = CollectionBlockSkeleton;

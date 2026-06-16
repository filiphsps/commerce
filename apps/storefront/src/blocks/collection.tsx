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
 * When the block instance sets no `layout`, the store-wide default (set in the
 * Customization hub's Blocks tab) decides — `'grid'`/`'carousel'` applies at every
 * breakpoint — and only when that is inherited too does the platform
 * {@link DEFAULT_LAYOUT} apply. A per-instance `layout` always wins over both.
 *
 * @param raw - The block's stored `layout`.
 * @param storeDefault - Store-wide default layout (`grid` | `carousel`) for unset blocks.
 * @returns The resolved responsive layout.
 */
const resolveBlockLayout = (raw: CollectionBlockNode['layout'], storeDefault?: string): CollectionLayout => {
    if (raw == null) {
        if (storeDefault === 'grid') return { base: 'grid' };
        if (storeDefault === 'carousel') return { base: 'carousel' };
        return DEFAULT_LAYOUT;
    }
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
    // Default-layout cascade: this block's per-instance override (Overrides group) wins over the
    // store-wide default, which wins over the platform default. An explicit responsive `layout`
    // still takes top priority inside resolveBlockLayout when set.
    const storeDefaultLayout = context.config?.blockDefaults?.collection?.defaultLayout;
    const fallbackLayout =
        block.defaultLayout ?? (typeof storeDefaultLayout === 'string' ? storeDefaultLayout : undefined);
    const layout = resolveBlockLayout(block.layout, fallbackLayout ?? undefined);
    // `colorScheme: dark` wraps the grid in a tenant-themeable dark surface (`--section-dark-bg`) and
    // applies `on-dark`, flipping the product-card option/price tokens (and, via `text-(--text)`, the
    // section title) to their light values so a collection reads correctly on a dark band.
    const dark = (block.colorScheme ?? 'light') === 'dark';

    return (
        <section
            data-block-type="collection"
            data-layout={layoutSummary(layout)}
            data-color-scheme={dark ? 'dark' : 'light'}
            className={cn(
                'flex w-full flex-col items-start justify-start gap-4 self-start',
                dark && 'on-dark rounded-lg bg-(--section-dark-bg) p-6 text-(--text)',
            )}
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

import 'server-only';

import {
    BREAKPOINTS,
    type Breakpoint,
    type ResponsiveValue,
    resolveResponsiveValue,
    responsiveClassName,
} from '@nordcom/commerce-cms/responsive';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { ComponentPropsWithoutRef, ComponentType, ElementType, ReactNode } from 'react';
import { Suspense } from 'react';
import { CollectionApi } from '@/api/_loaders';
import type { Product } from '@/api/product';
import { ShopifyApolloApiClient } from '@/api/shopify';
import type { CollectionFilters } from '@/api/shopify/collection';
import ProductCard from '@/components/product-card';
import CollectionBlockArrows from '@/components/products/collection-block-arrows';
import CollectionProductCard from '@/components/products/collection-product-card';
import CollectionViewAllTile from '@/components/products/collection-view-all-tile';
import type { Locale } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

type CardComponent = ComponentType<{
    shop: OnlineShop;
    locale: Locale;
    data: Product;
    priority?: boolean;
    className?: string;
}>;

type CardSkeletonComponent = ComponentType<{ className?: string }>;

const DefaultCardSkeleton: CardSkeletonComponent = () => <ProductCard.skeleton layout="vertical" chrome="boxed" />;

/** A single render mode for one breakpoint: a wrapping grid or a horizontal scroll rail. */
export type CollectionLayoutMode = 'grid' | 'carousel';

/** A per-breakpoint collection layout — e.g. `{ base: 'carousel', md: 'grid' }`. */
export type CollectionLayout = ResponsiveValue<CollectionLayoutMode>;

const RAIL_BASE = 'grid w-full gap-2 content-visibility-auto contain-intrinsic-size-[auto_100%]';

/**
 * Per-breakpoint, per-mode lookup of the `rail-grid` / `rail-carousel` utilities
 * (defined in `globals.css`). One static literal per cell so Tailwind's scanner
 * emits every variant; the rest is data-driven through {@link responsiveClassName}.
 */
const RAIL_CLASS_TABLE: Record<Breakpoint, Record<CollectionLayoutMode, string>> = {
    base: { grid: 'rail-grid', carousel: 'rail-carousel' },
    sm: { grid: 'sm:rail-grid', carousel: 'sm:rail-carousel' },
    md: { grid: 'md:rail-grid', carousel: 'md:rail-carousel' },
    lg: { grid: 'lg:rail-grid', carousel: 'lg:rail-carousel' },
    xl: { grid: 'xl:rail-grid', carousel: 'xl:rail-carousel' },
    '2xl': { grid: '2xl:rail-grid', carousel: '2xl:rail-carousel' },
};

/** Breakpoints at or above `md` — the fine-pointer surfaces where scroll arrows are useful. */
const DESKTOP_BREAKPOINTS: readonly Breakpoint[] = ['md', 'lg', 'xl', '2xl'];

/**
 * Resolves the layout, preferring an explicit `layout` and falling back to the
 * legacy `isHorizontal` boolean (carousel at every breakpoint when `true`, grid
 * when `false`/omitted).
 *
 * @param layout - Explicit per-breakpoint layout, when provided.
 * @param isHorizontal - Legacy single-axis flag used when `layout` is absent.
 * @returns The resolved responsive layout.
 */
const resolveLayout = (layout: CollectionLayout | undefined, isHorizontal: boolean | undefined): CollectionLayout =>
    layout ?? { base: isHorizontal ? 'carousel' : 'grid' };

/**
 * Builds the rail container className for a resolved layout: the shared base plus
 * one `rail-*` utility per defined breakpoint.
 *
 * @param layout - The resolved responsive layout.
 * @param className - Extra classes appended last.
 * @returns The merged className.
 */
const railClassName = (layout: CollectionLayout, className?: string): string | undefined =>
    cn(RAIL_BASE, responsiveClassName(layout, RAIL_CLASS_TABLE), className);

/**
 * Whether the layout is a carousel at any breakpoint (so the element is an
 * addressable scroll rail).
 *
 * @param layout - The resolved responsive layout.
 * @returns `true` when a carousel renders at any breakpoint.
 */
const hasCarousel = (layout: CollectionLayout): boolean =>
    BREAKPOINTS.some((breakpoint) => resolveResponsiveValue(layout, breakpoint) === 'carousel');

export type CollectionBlockBase<ComponentGeneric extends ElementType> = {
    as?: ComponentGeneric;
    children?: ReactNode;
    className?: string;

    shop: OnlineShop;
    locale: Locale;
    handle?: string;
    limit?: number;
    filters?: CollectionFilters;
    isHorizontal?: boolean;
    layout?: CollectionLayout;
    showViewAll?: boolean;
    priority?: boolean;

    bare?: boolean;
    card?: CardComponent;
    cardSkeleton?: CardSkeletonComponent;
};

export type CollectionBlockProps<ComponentGeneric extends ElementType> = CollectionBlockBase<ComponentGeneric> &
    (ComponentGeneric extends keyof React.JSX.IntrinsicElements
        ? Omit<ComponentPropsWithoutRef<ComponentGeneric>, keyof CollectionBlockBase<ComponentGeneric>>
        : ComponentPropsWithoutRef<ComponentGeneric>);

/**
 * Async server component that fetches a collection and renders its products as a responsive card grid or horizontal rail.
 *
 * @param props.as - Wrapper element type; defaults to `'div'`.
 * @param props.shop - Shop record forwarded to the Shopify API client.
 * @param props.locale - Locale forwarded to the API client and each product card.
 * @param props.handle - Collection handle to fetch; when omitted only `children` are rendered.
 * @param props.limit - Maximum number of products to fetch.
 * @param props.filters - Additional collection query filters.
 * @param props.isHorizontal - Legacy flag: lays out as a horizontally scrollable rail on both breakpoints when `true`. Superseded by `layout`.
 * @param props.layout - Per-breakpoint layout (`{ mobile, desktop }`); each breakpoint renders a grid or a horizontal rail independently.
 * @param props.showViewAll - When `true`, appends a view-all tile at the end of the grid.
 * @param props.priority - Passed to the first two product cards for eager image loading.
 * @param props.bare - When `true`, renders cards without a wrapper element.
 * @param props.card - Custom card component; defaults to `CollectionProductCard`.
 * @param props.cardSkeleton - Custom skeleton component; defaults to a vertical boxed `ProductCard.skeleton`.
 * @param props.children - Additional content prepended inside the grid.
 * @returns The product grid element, or `null` when there are no products and no children.
 */
const CollectionBlock = async <ComponentGeneric extends ElementType = 'div'>({
    as,
    children = null,
    className,

    shop,
    locale,
    handle,
    limit,
    filters = undefined,
    isHorizontal,
    layout,
    showViewAll = true,
    priority,

    bare = false,
    card,
    cardSkeleton,
    ...props
}: CollectionBlockProps<ComponentGeneric>) => {
    const Tag = (as ?? 'div') as ElementType;
    const Card = card ?? CollectionProductCard;
    const CardSkeleton = cardSkeleton ?? DefaultCardSkeleton;

    const collection = handle
        ? await CollectionApi({
              api: await ShopifyApolloApiClient({ shop, locale }),
              handle,
              first: limit,
              ...filters,
          })
        : null;

    const products = (collection?.products.edges || []).map(({ node: product }) => product) as Product[];
    if (products.length <= 0 && !children) {
        return null;
    }

    const productCards = products.map((product, index) => (
        <Suspense key={product.id} fallback={<CardSkeleton />}>
            <Card shop={shop} locale={locale} data={product} priority={priority && index < 2} />
        </Suspense>
    ));

    if (bare) {
        return <>{productCards}</>;
    }

    const railId = handle ? `rail-${handle}` : 'rail';
    const resolvedLayout = resolveLayout(layout, isHorizontal);
    // Arrows are a fine-pointer affordance and self-hide on coarse pointers, so they only matter when
    // a carousel renders at a desktop (`md`+) breakpoint; smaller carousels use native swipe.
    const showArrows = DESKTOP_BREAKPOINTS.some(
        (breakpoint) => resolveResponsiveValue(resolvedLayout, breakpoint) === 'carousel',
    );

    return (
        // `w-full min-w-0` pins this wrapper to the container width. Without it, a parent that
        // cross-aligns its children (`items-start`, e.g. the CMS Collection block section) shrink-wraps
        // this div to content size: the grid layout then collapses to a single column (vertical list on
        // mobile) and the horizontal rail blows past the viewport instead of scroll-containing.
        <div className="relative w-full min-w-0">
            {showArrows ? <CollectionBlockArrows railSelector={`[data-rail='${railId}']`} /> : null}
            <Tag
                {...props}
                data-rail={hasCarousel(resolvedLayout) ? railId : undefined}
                className={railClassName(resolvedLayout, className)}
            >
                {children}
                {productCards}
                {collection && showViewAll ? <CollectionViewAllTile collection={collection} /> : null}
            </Tag>
        </div>
    );
};

CollectionBlock.displayName = 'Nordcom.Products.CollectionBlock';

/**
 * Grid skeleton for a collection block, rendering `length` card skeleton placeholders.
 *
 * @param props.length - Number of skeleton cards to render; defaults to 7.
 * @param props.isHorizontal - Legacy flag: horizontal rail placeholder on both breakpoints when `true`. Superseded by `layout`.
 * @param props.layout - Per-breakpoint layout matching the live rail, so the placeholder reserves the same footprint.
 * @param props.bare - When `true`, renders only the skeleton cards without a wrapper.
 * @param props.className - Additional CSS class names for the wrapper element.
 * @param props.cardSkeleton - Custom skeleton card component; defaults to `DefaultCardSkeleton`.
 * @returns The skeleton grid element.
 */
CollectionBlock.skeleton = ({
    isHorizontal = false,
    layout,
    bare = false,
    length = 7,
    className,
    cardSkeleton,
}: {
    length?: number;
    isHorizontal?: boolean;
    layout?: CollectionLayout;
    bare?: boolean;
    className?: string;
    cardSkeleton?: CardSkeletonComponent;
}) => {
    const CardSkeleton = cardSkeleton ?? DefaultCardSkeleton;
    const cards = Array.from({ length }).map((_, index) => <CardSkeleton key={index} />);

    if (bare) {
        return <>{cards}</>;
    }

    return <div className={railClassName(resolveLayout(layout, isHorizontal), className)}>{cards}</div>;
};

export default CollectionBlock;

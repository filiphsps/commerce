import 'server-only';

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
 * @param props.isHorizontal - When `true`, lays out as a horizontally scrollable rail.
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

    return (
        <div className="relative">
            {isHorizontal ? <CollectionBlockArrows railSelector={`[data-rail='${railId}']`} /> : null}
            <Tag
                {...props}
                data-rail={isHorizontal ? railId : undefined}
                className={cn(
                    'contain-intrinsic-size-[auto_100%] grid w-full snap-x snap-mandatory gap-2 content-visibility-auto',
                    !isHorizontal &&
                        'justify-(--product-card-grid-align) grid-cols-[repeat(auto-fill,minmax(var(--product-card-min-width),var(--product-card-max-width)))]',
                    isHorizontal &&
                        'overflow-x-shadow -my-2 scroll-px-(--block-padding) auto-cols-[var(--product-card-max-width)] grid-flow-col grid-cols-[var(--product-card-max-width)] grid-rows-1 overscroll-x-auto py-2',
                    className,
                )}
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
 * @param props.isHorizontal - Applies horizontal rail layout classes when `true`.
 * @param props.bare - When `true`, renders only the skeleton cards without a wrapper.
 * @param props.className - Additional CSS class names for the wrapper element.
 * @param props.cardSkeleton - Custom skeleton card component; defaults to `DefaultCardSkeleton`.
 * @returns The skeleton grid element.
 */
CollectionBlock.skeleton = ({
    isHorizontal = false,
    bare = false,
    length = 7,
    className,
    cardSkeleton,
}: {
    length?: number;
    isHorizontal?: boolean;
    bare?: boolean;
    className?: string;
    cardSkeleton?: CardSkeletonComponent;
}) => {
    const CardSkeleton = cardSkeleton ?? DefaultCardSkeleton;
    const cards = Array.from({ length }).map((_, index) => <CardSkeleton key={index} />);

    if (bare) {
        return <>{cards}</>;
    }

    return (
        <div
            className={cn(
                'grid w-full gap-2',
                !isHorizontal &&
                    'justify-(--product-card-grid-align) grid-cols-[repeat(auto-fill,minmax(var(--product-card-min-width),var(--product-card-max-width)))]',
                isHorizontal &&
                    '-mr-8 auto-cols-[var(--product-card-max-width)] grid-flow-col grid-cols-[var(--product-card-max-width)] grid-rows-1 overflow-x-clip overscroll-none',
                className,
            )}
        >
            {cards}
        </div>
    );
};

export default CollectionBlock;

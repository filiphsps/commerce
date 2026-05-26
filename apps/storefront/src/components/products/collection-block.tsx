import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import type { ComponentPropsWithoutRef, ComponentType, ElementType, ReactNode } from 'react';
import { Suspense } from 'react';
import { CollectionApi } from '@/api/_loaders';
import type { Product } from '@/api/product';
import { ShopifyApolloApiClient } from '@/api/shopify';
import type { CollectionFilters } from '@/api/shopify/collection';
import ProductCard from '@/components/product-card';
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

    return (
        <Tag
            {...props}
            className={cn(
                'contain-intrinsic-size-[auto_100%] grid w-full snap-x snap-mandatory gap-2 content-visibility-auto',
                !isHorizontal &&
                    'grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] md:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))]',
                isHorizontal &&
                    'overflow-x-shadow -my-2 auto-cols-[minmax(13rem,1fr)] grid-flow-col grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] grid-rows-1 overscroll-x-auto py-2',
                className,
            )}
        >
            {children}
            {productCards}
            {collection && showViewAll ? <CollectionViewAllTile collection={collection} /> : null}
        </Tag>
    );
};

CollectionBlock.displayName = 'Nordcom.Products.CollectionBlock';

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
                    'grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] md:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))]',
                isHorizontal &&
                    '-mr-8 auto-cols-[minmax(12rem,1fr)] grid-flow-col grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] grid-rows-1 overflow-x-clip overscroll-none',
                className,
            )}
        >
            {cards}
        </div>
    );
};

export default CollectionBlock;

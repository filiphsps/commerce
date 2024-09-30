import 'server-only';

import { Suspense } from 'react';

import { type OnlineShop } from '@nordcom/commerce-db';

import { ShopifyApolloApiClient } from '@/api/shopify';
import { CollectionApi } from '@/api/shopify/collection';
import { cn } from '@/utils/tailwind';

import Link from '@/components/link';
import ProductCard, { CARD_STYLES } from '@/components/product-card/product-card';

import type { Product } from '@/api/product';
import type { CollectionFilters } from '@/api/shopify/collection';
import type { Locale } from '@/utils/locale';
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

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
    ...props
}: CollectionBlockProps<ComponentGeneric>) => {
    const Tag = as ?? 'div';

    const collection = handle
        ? await CollectionApi({
              api: await ShopifyApolloApiClient({ shop, locale }),
              handle,
              // TODO: Pagination for the full variation.
              first: limit,
              ...filters
          })
        : null;

    const products = (collection?.products.edges || []).map(({ node: product }) => product) as Product[];
    if (products.length <= 0 && !children) {
        return null;
    }

    const productCards = products.map((product, index) => (
        <Suspense key={product.id} fallback={<ProductCard.skeleton />}>
            <ProductCard shop={shop} locale={locale} data={product} priority={priority && index < 2} />
        </Suspense>
    ));

    if (products.length <= 0 && !children) {
        return null;
    }

    if (bare) {
        return <>{productCards}</>;
    }

    return (
        <Tag
            {...props}
            className={cn(
                'content-visibility-auto contain-intrinsic-size-[auto_100%] grid w-full snap-x snap-mandatory gap-2',
                !isHorizontal &&
                    'grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] md:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))]',
                isHorizontal &&
                    'overflow-x-shadow -my-2 auto-cols-[minmax(13rem,1fr)] grid-flow-col grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] grid-rows-1 overscroll-x-auto py-2',
                className
            )}
        >
            {children}
            {productCards}

            {collection && showViewAll ? (
                <Link
                    href={`/collections/${collection.handle}/`}
                    className={cn(
                        CARD_STYLES,
                        'bg-primary text-primary-foreground hover:text-primary-foreground *:text-primary-foreground border-primary-dark flex items-center justify-center p-3 transition-all hover:brightness-75 hover:transition-all'
                    )}
                    // TODO: i18n.
                    // TODO: View all {products.length} {Pluralize({ count: products.length, noun: 'product' })}.
                >
                    <div className="text-center text-inherit">
                        View all of the products in <b className="font-bold">{collection.title}</b>.
                    </div>
                </Link>
            ) : null}
        </Tag>
    );
};
CollectionBlock.displayName = 'Nordcom.Products.CollectionBlock';

CollectionBlock.skeleton = ({
    isHorizontal = false,
    bare = false,
    length = 7
}: {
    length?: number;
    isHorizontal?: boolean;
    bare?: boolean;
}) => {
    const cards = Array.from({ length }).map((_, index) => <ProductCard.skeleton key={index} />);

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
                    '-mr-8 auto-cols-[minmax(12rem,1fr)] grid-flow-col grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] grid-rows-1 overflow-x-clip overscroll-none'
            )}
        >
            {cards}
        </div>
    );
};

CollectionBlock.displayName = 'Nordcom.Products.CollectionBlock';
export default CollectionBlock;

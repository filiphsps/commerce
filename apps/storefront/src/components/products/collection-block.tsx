import 'server-only';

import styles from '@/components/products/collection-block.module.scss';

import { Suspense } from 'react';

import { type OnlineShop } from '@nordcom/commerce-db';

import { ShopifyApolloApiClient } from '@/api/shopify';
import { CollectionApi } from '@/api/shopify/collection';
import { cn } from '@/utils/tailwind';

import Link from '@/components/link';
import ProductCard from '@/components/product-card/product-card';

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
    handle: string;
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
    showViewAll,
    priority,

    bare = false,
    ...props
}: CollectionBlockProps<ComponentGeneric>) => {
    const Tag = as ?? 'div';

    const api = await ShopifyApolloApiClient({ shop, locale });
    const collection = await CollectionApi({
        api,
        handle,
        // TODO: Pagination for the full variation.
        first: limit,
        ...filters
    });

    // TODO: Add collection type.
    const products: Product[] = (collection as any)?.products?.edges?.map(({ node }: any) => node as any) || [];
    if (products.length <= 0) {
        return null;
    }

    const productCards = products.map((product, index) => (
        <Suspense key={product.id} fallback={<ProductCard.skeleton />}>
            <ProductCard shop={shop} locale={locale} data={product} priority={priority && index < 2} />
        </Suspense>
    ));

    if (bare) {
        return <>{productCards}</>;
    }

    return (
        <Tag
            {...props}
            data-orientation={isHorizontal ? 'horizontal' : 'vertical'}
            className={cn(
                !isHorizontal &&
                    'grid w-full grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2 md:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))]',
                isHorizontal &&
                    'overflow-x-shadow grid w-full auto-cols-[minmax(12rem,1fr)] grid-flow-col grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] grid-rows-1 gap-2 overscroll-x-auto sm:auto-cols-[minmax(14rem,1fr)] sm:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]',
                className
            )}
        >
            {children}
            {productCards}

            {showViewAll ? (
                <Link
                    href={`/collections/${collection.handle}/`}
                    className={styles.viewAll}
                    // TODO: i18n.
                    // TODO: View all {products.length} {Pluralize({ count: products.length, noun: 'product' })}.
                >
                    <div className="text-center">
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
    length = 6
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
        <section className={cn(styles.container, isHorizontal && styles.horizontal)}>
            <div className={styles.content}>{cards}</div>
        </section>
    );
};

CollectionBlock.displayName = 'Nordcom.Products.CollectionBlock';
export default CollectionBlock;

'use client';

import styled from 'styled-components';

import styles from '@/components/CollectionBlock/collection-block.module.scss';
import ProductCard from '@/components/ProductCard';
import Link from '@/components/link';
import type { StoreModel } from '@/models/StoreModel';
import { FirstAvailableVariant } from '@/utils/first-available-variant';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { ProductProvider } from '@shopify/hydrogen-react';
import type { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import { Suspense, type ReactElement } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList } from 'react-window';

const Content = styled.div`
    display: grid;
    grid-template-columns: repeat(
        auto-fit,
        minmax(calc(var(--component-product-card-width) + var(--block-padding)), auto)
    );
    column-count: 2;
    column-gap: var(--block-spacer-large);
    gap: var(--block-spacer-large);
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;

    @media (min-width: 950px) {
        justify-content: start;
        column-gap: var(--block-spacer);
        gap: var(--block-spacer);
    }

    section {
        width: 100%;
        min-width: unset;
    }

    &.horizontal {
        touch-action: pan-x pan-y;
        overscroll-behavior: auto auto;
        padding: var(--block-padding-large) 0;
        padding-right: var(--block-spacer-large);
        margin: calc(var(--block-padding-large) * -1) 0;
        columns: none;
        display: grid;
        overflow-x: auto;
        grid-template-columns: repeat(auto-fit, minmax(auto, 1fr));
        grid-template-rows: 1fr;
        grid-auto-flow: column;
        scroll-padding-left: var(--block-padding-large);
    }
`;

const Container = styled.div`
    position: relative;
    width: 100%;
    min-width: 100%;
    min-height: 36.5rem;
`;

type CollectionBlockProps = {
    data?: Collection;
    elements?: ReactElement[];
    limit?: number;
    isHorizontal?: boolean;
    showViewAll?: boolean;
    store: StoreModel;
    i18n: LocaleDictionary;
    locale: Locale;
};
const CollectionBlock = ({
    data: collection,
    elements,
    limit,
    isHorizontal,
    showViewAll,
    store,
    locale,
    i18n
}: CollectionBlockProps) => {
    const { handle } = collection || {};
    const products = collection?.products?.edges || [];

    let content = null;

    if (!isHorizontal) {
        content = (
            <Content>
                {products.map(({ node: product }, index) => (
                    <ProductProvider
                        key={product?.id}
                        data={product}
                        initialVariantId={FirstAvailableVariant(product)?.id}
                    >
                        {elements ? (
                            elements[index]
                        ) : (
                            <ProductCard handle={product?.handle} store={store} locale={locale} i18n={i18n} />
                        )}
                    </ProductProvider>
                ))}
            </Content>
        );
    } else {
        content = (
            <Suspense>
                <AutoSizer>
                    {({ height, width }) => (
                        <FixedSizeList
                            // TODO: Switch to `react-virtualized`.
                            layout="horizontal"
                            height={height}
                            width={width}
                            itemSize={width <= 900 ? 205 : 230}
                            itemCount={products.length + (showViewAll ? 1 : 0)}
                            itemKey={(index) => products[index]?.node.id || index}
                            children={({ index, style }) => {
                                if (!limit || (limit && index < limit)) {
                                    const product = products[index]?.node;

                                    return (
                                        <ProductProvider
                                            key={product?.id}
                                            data={product}
                                            initialVariantId={FirstAvailableVariant(product)?.id}
                                        >
                                            <div style={{ ...style, paddingRight: 'var(--block-spacer)' }}>
                                                {elements ? (
                                                    elements[index]
                                                ) : (
                                                    <ProductCard
                                                        handle={product?.handle}
                                                        store={store}
                                                        locale={locale}
                                                        i18n={i18n}
                                                    />
                                                )}
                                            </div>
                                        </ProductProvider>
                                    );
                                }

                                return (
                                    <Link
                                        style={style}
                                        href={`/collections/${handle}/`}
                                        className={styles.viewAll}
                                        locale={locale}
                                        title="Browse all products" // TODO: i18n.
                                        // TODO: View all {products.length} {Pluralize({ count: products.length, noun: 'product' })}.
                                    >
                                        View all of the products in this collection
                                    </Link>
                                );
                            }}
                        />
                    )}
                </AutoSizer>
            </Suspense>
        );
    }

    return <Container className={isHorizontal ? 'horizontal' : 'vertical'}>{content}</Container>;
};

export default CollectionBlock;

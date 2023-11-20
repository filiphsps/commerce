'use client';

import ProductCard from '@/components/ProductCard';
import Link from '@/components/link';
import styles from '@/components/products/collection-block.module.scss';
import type { StoreModel } from '@/models/StoreModel';
import { FirstAvailableVariant } from '@/utils/first-available-variant';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { ProductProvider } from '@shopify/hydrogen-react';
import type { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import { type ReactElement } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList } from 'react-window';

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

    if (!products || products.length <= 0) return null;

    let content = null;
    if (!isHorizontal) {
        content = (
            <div className={styles.content}>
                {products.map(({ node: product }, index) => (
                    <ProductProvider
                        key={product?.id}
                        data={product}
                        initialVariantId={FirstAvailableVariant(product)?.id}
                    >
                        {elements ? elements[index] : <ProductCard store={store} locale={locale} i18n={i18n} />}
                    </ProductProvider>
                ))}
            </div>
        );
    } else {
        content = (
            <AutoSizer>
                {({ height, width }) => (
                    <FixedSizeList
                        layout="horizontal"
                        height={height}
                        width={width}
                        className={`${styles.content}`}
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
                                        <div
                                            style={{
                                                ...style,
                                                left: `calc(var(--block-padding-large) + ${style.left}px)`,
                                                right: `calc(var(--block-padding-large) + ${style.right || 0}px)`,
                                                paddingRight: 'var(--block-spacer)'
                                            }}
                                        >
                                            {elements ? (
                                                elements[index]
                                            ) : (
                                                <ProductCard store={store} locale={locale} i18n={i18n} />
                                            )}
                                        </div>
                                    </ProductProvider>
                                );
                            }

                            return (
                                <div
                                    style={{
                                        ...style,
                                        left: `calc(var(--block-padding-large) + ${style.left}px)`,
                                        right: `calc(var(--block-padding-large) + ${style.right || 0}px)`
                                    }}
                                >
                                    <Link
                                        href={`/collections/${handle}/`}
                                        className={styles.viewAll}
                                        locale={locale}
                                        title="Browse all products" // TODO: i18n.
                                        // TODO: View all {products.length} {Pluralize({ count: products.length, noun: 'product' })}.
                                    >
                                        View all of the products in this collection
                                    </Link>
                                </div>
                            );
                        }}
                    />
                )}
            </AutoSizer>
        );
    }

    return (
        <div
            className={`${styles.container} ${isHorizontal ? styles.horizontal : ''} ${
                isHorizontal ? 'horizontal' : 'vertical'
            }`}
        >
            {content}
        </div>
    );
};

export default CollectionBlock;

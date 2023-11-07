'use client';

import styled from 'styled-components';

import type { StoreModel } from '@/models/StoreModel';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { ProductProvider } from '@shopify/hydrogen-react';
import type { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import ProductCard from '../ProductCard';

const Content = styled.div`
    column-count: 2;
    column-gap: var(--block-spacer-large);
    gap: var(--block-spacer-large);
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;

    @media (min-width: 950px) {
        column-gap: var(--block-spacer);
        gap: var(--block-spacer);
    }

    &.Horizontal {
        padding: var(--block-padding-large) 0;
        padding-right: var(--block-spacer-large);
        margin: calc(var(--block-padding-large) * -1) 0;
        columns: none;
        display: grid;
        overflow-x: auto;
        grid-template-columns: repeat(auto-fit, minmax(auto, 1fr));
        grid-template-rows: 1fr;
        grid-auto-flow: column;
        overscroll-behavior-x: contain;
        scroll-padding-left: var(--block-padding-large);

        .First {
            margin-left: calc(var(--block-spacer-large));
        }
    }

    &.Vertical {
        display: grid;
        grid-template-columns: repeat(
            auto-fit,
            minmax(calc(var(--component-product-card-width) + var(--block-padding)), auto)
        );

        @media (min-width: 950px) {
            justify-content: start;
        }

        section {
            width: 100%;
            min-width: unset;
        }
    }
`;

const Container = styled.div`
    position: relative;
    width: 100%;
    min-width: 100%;

    &.Horizontal {
        width: calc(100% + var(--block-padding-large) * 2);
        margin-left: calc(var(--block-padding-large) * -1);
    }
`;

type CollectionBlockProps = {
    data?: Collection;
    limit?: number;
    isHorizontal?: boolean;
    store: StoreModel;
    i18n: LocaleDictionary;
    locale: Locale;
};
const CollectionBlock = ({ data: collection, limit, isHorizontal, store, locale, i18n }: CollectionBlockProps) => {
    const products = collection?.products?.edges || [];

    return (
        <Container className={(isHorizontal && 'Horizontal') || 'Vertical'}>
            <Content className={(isHorizontal && 'Horizontal') || 'Vertical'}>
                {products.map((edge, index) => {
                    if (limit && index >= limit) return null;
                    if (!edge?.node) return null;

                    const product = edge.node;

                    return (
                        <ProductProvider
                            key={product?.id}
                            data={product}
                            initialVariantId={product.variants.edges.at(-1)?.node.id || undefined}
                        >
                            <ProductCard
                                handle={product?.handle}
                                store={store}
                                locale={locale}
                                className={(index === 0 && 'First') || ''}
                                i18n={i18n}
                            />
                        </ProductProvider>
                    );
                })}
            </Content>
        </Container>
    );
};

export default CollectionBlock;

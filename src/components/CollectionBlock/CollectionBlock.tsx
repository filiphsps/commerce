'use client';

import styled, { css } from 'styled-components';

import type { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import type { LocaleDictionary } from '@/utils/Locale';
import { ProductProvider } from '@shopify/hydrogen-react';
import type { StoreModel } from '@/models/StoreModel';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const ProductCard = dynamic(() => import('@/components/ProductCard'));

const Content = styled.div<{
    $horizontal?: boolean;
}>`
    column-count: 2;
    column-gap: var(--block-spacer-large);
    gap: var(--block-spacer-large);
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;

    @media (min-width: 950px) {
        column-gap: var(--block-spacer);
        gap: var(--block-spacer);
    }

    ${({ $horizontal }) =>
        $horizontal &&
        css`
            padding: var(--block-padding-large) 0;
            padding-right: var(--block-spacer-large);
            margin: calc(var(--block-padding-large) * -1) 0;
            column: none;
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
        `}

    ${({ $horizontal }) =>
        !$horizontal &&
        css`
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
        `}
`;

const Container = styled.div<{
    $horizontal?: boolean;
}>`
    position: relative;
    width: 100%;
    min-width: 100%;

    ${({ $horizontal }) =>
        $horizontal &&
        css`
            width: calc(100% + var(--block-padding-large) * 2);
            margin-left: calc(var(--block-padding-large) * -1);
        `}
`;

type CollectionBlockProps = {
    handle?: string;
    limit?: number;
    data?: Collection;

    isHorizontal?: boolean;
    showDescription?: boolean;
    search?: boolean;
    store: StoreModel;
    i18n: LocaleDictionary;
};
const CollectionBlock = ({ data: collection, limit, isHorizontal, store, i18n }: CollectionBlockProps) => {
    const products = (collection?.products?.edges || []).map((edge, index) => {
        if (limit && index >= limit) return null;
        if (!edge?.node) return null;

        const product = edge.node;
        return (
            <ProductProvider
                key={`minimal_${product?.id}`}
                data={product}
                initialVariantId={product.variants.edges.at(-1)?.node.id || undefined}
            >
                <ProductCard
                    handle={product?.handle}
                    store={store}
                    className={(index === 0 && 'First') || ''}
                    i18n={i18n}
                />
            </ProductProvider>
        );
    });

    return (
        <Suspense>
            <Container $horizontal={isHorizontal}>
                <Content $horizontal={isHorizontal}>{products.length > 0 && products}</Content>
            </Container>
        </Suspense>
    );
};

export default CollectionBlock;

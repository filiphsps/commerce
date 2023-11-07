'use client';

import styled, { css } from 'styled-components';

import { CollectionApi } from '@/api/shopify/collection';
import type { StoreModel } from '@/models/StoreModel';
import { ShopifyApolloApiBuilder } from '@/utils/abstract-api';
import { FirstAvailableVariant } from '@/utils/first-available-variant';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { useApolloClient } from '@apollo/client';
import { ProductProvider } from '@shopify/hydrogen-react';
import type { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import dynamic from 'next/dynamic';
import type { FunctionComponent } from 'react';
import useSWR from 'swr';

const ProductCard = dynamic(() => import('@/components/ProductCard'));

const Content = styled.div<{ $short?: boolean }>`
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--block-spacer);
    width: 100%;
    padding: 0;
    margin: 0;

    section {
        min-width: unset;
    }

    ${({ $short }) =>
        $short &&
        css`
            @media (min-width: 625px) {
                && {
                    grid-template-columns: repeat(
                        auto-fit,
                        minmax(
                            var(--component-product-card-width),
                            calc(var(--component-product-card-width) + var(--block-padding-large) * 4)
                        )
                    );
                }
            }
        `}

    @media (min-width: 385px) {
        grid-template-columns: 1fr 1fr;
    }

    @media (min-width: 625px) {
        grid-template-columns: 1fr 1fr 1fr;
    }

    @media (min-width: 720px) {
        grid-template-columns: repeat(auto-fit, minmax(calc(var(--component-product-card-width)), 1fr));
    }
`;

const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: var(--block-spacer);
`;

interface VerticalCollectionProps {
    store: StoreModel;
    locale: Locale;
    handle?: string;
    data?: Collection;
    i18n: LocaleDictionary;
}
export const VerticalCollection: FunctionComponent<VerticalCollectionProps> = ({
    store,
    locale,
    handle,
    data: collectionData,
    i18n
}) => {
    const { data: collection } = useSWR(
        [
            'CollectionApi',
            {
                client: ShopifyApolloApiBuilder({ locale, api: useApolloClient() }),
                handle: handle || collectionData?.handle!
            }
        ],
        ([, props]) => CollectionApi(props),
        {
            fallbackData: collectionData
        }
    );

    const products = collection?.products?.edges || [];

    return (
        <Container>
            <Content $short={(products.length || 0) < 5}>
                {products.map(({ node: product }) => {
                    return (
                        <ProductProvider
                            key={product?.id}
                            data={product}
                            initialVariantId={FirstAvailableVariant(product)?.id}
                        >
                            <ProductCard handle={product?.handle} store={store} locale={locale} i18n={i18n} />
                        </ProductProvider>
                    );
                })}
            </Content>
        </Container>
    );
};

'use client';

import styled, { css } from 'styled-components';

import { CollectionApi } from '@/api/collection';
import type { StoreModel } from '@/models/StoreModel';
import { Config } from '@/utils/config';
import type { LocaleDictionary } from '@/utils/locale';
import { NextLocaleToLocale } from '@/utils/locale';
import { ProductProvider } from '@shopify/hydrogen-react';
import type { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
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
    handle?: string;
    data?: Collection;
    store: StoreModel;
    i18n: LocaleDictionary;
}
export const VerticalCollection: FunctionComponent<VerticalCollectionProps> = ({
    handle,
    data: collectionData,
    store,
    i18n
}) => {
    const route = usePathname();
    const locale = NextLocaleToLocale(route?.split('/').at(1) || Config.i18n.default); // FIXME: Handle this properly.

    const { data: collection } = useSWR(
        [
            'CollectionApi',
            {
                handle: handle || collectionData?.handle!,
                locale: locale.locale
            }
        ],
        ([, props]) => CollectionApi(props),
        {
            fallbackData: collectionData
        }
    );

    return (
        <Container>
            <Content $short={(collection?.products?.edges?.length || 0) < 5}>
                {(collection?.products?.edges || []).map(({ node: product }) => (
                    <ProductProvider
                        key={`minimal_${product?.id}`}
                        data={product}
                        initialVariantId={product.variants.edges.at(-1)?.node.id || undefined}
                    >
                        <ProductCard handle={product?.handle} store={store} i18n={i18n} />
                    </ProductProvider>
                ))}
            </Content>
        </Container>
    );
};

import styled, { css } from 'styled-components';

import { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import { CollectionApi } from 'src/api/collection';
import { FunctionComponent } from 'react';
import ProductCard from '../ProductCard';
import { ProductProvider } from '@shopify/hydrogen-react';
import { StoreModel } from 'src/models/StoreModel';
import { useRouter } from 'next/router';
import useSWR from 'swr';

const Content = styled.div<{ short?: boolean }>`
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--block-spacer);
    width: 100%;
    padding: 0px;
    margin: 0px;

    section {
        min-width: unset;
    }

    ${({ short }) =>
        short &&
        css`
            @media (min-width: 625px) {
                && {
                    grid-template-columns: repeat(
                        auto-fit,
                        minmax(
                            var(--component-product-card-width),
                            calc(
                                var(--component-product-card-width) + var(--block-padding-large) * 4
                            )
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
        grid-template-columns: repeat(
            auto-fit,
            minmax(calc(var(--component-product-card-width)), 1fr)
        );
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
}
export const VerticalCollection: FunctionComponent<VerticalCollectionProps> = ({
    handle,
    data,
    store
}) => {
    const router = useRouter();

    const { data: collection } = useSWR(
        {
            handle: data?.handle! || handle,
            locale: router.locale
        },
        CollectionApi,
        {
            fallbackData: data
        }
    );

    return (
        <Container>
            <Content short={(collection?.products?.edges?.length || 0) <= 5 || undefined}>
                {(collection?.products?.edges || []).map(({ node: product }) => (
                    <ProductProvider key={`minimal_${product?.id}`} data={product}>
                        <ProductCard handle={product?.handle} store={store} />
                    </ProductProvider>
                ))}
            </Content>
        </Container>
    );
};

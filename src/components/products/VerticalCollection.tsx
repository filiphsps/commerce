import { ActionBar, ActionBarItem } from '../layout/ActionBar';
import { FunctionComponent, useState } from 'react';
import styled, { css } from 'styled-components';

import { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import { CollectionApi } from 'src/api/collection';
import ProductCard from '../ProductCard';
import { ProductProvider } from '@shopify/hydrogen-react';
import { StoreModel } from 'src/models/StoreModel';
import { useRouter } from 'next/router';
import useSWR from 'swr';

const Content = styled.div<{ listView?: boolean }>`
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--block-spacer);
    width: 100%;
    padding: 0px;
    margin: 0px;

    section {
        min-width: unset;
    }

    ${({ listView }) =>
        !listView &&
        css`
            @media (min-width: 385px) {
                grid-template-columns: 1fr 1fr;
            }

            @media (min-width: 625px) {
                grid-template-columns: 1fr 1fr 1fr;
            }
        `}

    @media (min-width:${({ listView }) => (!listView && '720px') || '950px'}) {
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

    @media (min-width: 950px) {
        ${ActionBar} {
            display: none;
        }
    }
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
    const [listView, setListView] = useState(false);

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
            <ActionBar>
                <ActionBarItem active={listView} onClick={() => setListView(true)}>
                    List
                </ActionBarItem>
                <ActionBarItem active={!listView} onClick={() => setListView(false)}>
                    Grid
                </ActionBarItem>
            </ActionBar>
            <Content listView={listView}>
                {(collection?.products?.edges || []).map(({ node: product }) => (
                    <ProductProvider key={`minimal_${product?.id}`} data={product}>
                        <ProductCard listView={listView} handle={product?.handle} store={store} />
                    </ProductProvider>
                ))}
            </Content>
        </Container>
    );
};

import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import React, { FunctionComponent, useRef } from 'react';
import styled, { css } from 'styled-components';

import { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import { CollectionApi } from '../../api/collection';
import LanguageString from '../LanguageString';
import Link from 'next/link';
import ProductCard from '../ProductCard';
import { ProductProvider } from '@shopify/hydrogen-react';
import { StoreModel } from '../../models/StoreModel';
import { useRouter } from 'next/router';
import useSWR from 'swr';

const Title = styled.div``;
const Subtitle = styled.div``;

const Actions = styled.div`
    position: absolute;
    z-index: 99999;
    top: -2rem;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    pointer-events: none;

    @media (min-width: 1500px) {
        //left: -4.5rem;
        //right: -4.5rem;
    }
`;
const Action = styled.div`
    font-size: 4rem;
    color: #404756;
    cursor: pointer;
    transition: 150ms ease-in-out;
    pointer-events: all;
    user-select: none;
    margin-top: -0.5rem;

    &:hover,
    &:active {
        color: var(--accent-primary);
        transform: scale(1.15);
    }
`;

const Meta = styled.div``;

const Content = styled.div<{
    horizontal?: boolean;
}>`
    column-count: 2;
    column-gap: 1rem;
    gap: 1rem;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;

    section + section {
        margin-top: 1rem;

        @media (min-width: 950px) {
            margin-top: 0px;
        }

        ${({ horizontal }) =>
            horizontal &&
            css`
                margin-top: 0px;
            `}
    }

    ${({ horizontal }) =>
        horizontal &&
        css`
            column: none;
            display: grid;
            overflow-x: auto;
            grid-template-columns: repeat(auto-fit, minmax(auto, 1fr));
            grid-auto-columns: auto;
            grid-template-rows: 1fr;
            grid-auto-flow: column;

            &::-webkit-scrollbar {
                display: none;
            }
            scrollbar-width: none;
            -ms-overflow-style: none;
        `}

    @media (min-width: 950px) {
        ${({ horizontal }) =>
            !horizontal &&
            css`
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(16.5rem, 1fr));
                justify-content: start;

                section {
                    width: 100%;
                }
            `}
    }
`;

const Container = styled.div<{
    horizontal?: boolean;
}>`
    position: relative;
    width: 100%;

    ${({ horizontal }) =>
        horizontal &&
        css`
            width: calc(100% + var(--block-padding-large) * 2);
            margin-left: calc(var(--block-padding-large) * -1);

            ${Content} {
                padding: 0px var(--block-padding-large);
                scroll-padding-left: var(--block-padding-large);
            }
        `}
`;

interface CollectionBlockProps {
    handle?: string;
    limit?: number;
    data?: Collection;
    country?: string;
    hideTitle?: boolean;
    noLink?: boolean;

    isHorizontal?: boolean;
    showDescription?: boolean;
    brand?: boolean;
    search?: boolean;
    plainTitle?: boolean;
    store: StoreModel;
}
const CollectionBlock: FunctionComponent<CollectionBlockProps> = ({
    hideTitle,
    data,
    handle,
    limit,
    isHorizontal,
    store
}) => {
    const router = useRouter();

    const { data: collection } = useSWR(
        handle ? [handle] : null,
        ([url]) => CollectionApi({ handle: url, locale: router.locale }),
        {
            fallbackData: data
        }
    );

    const content_ref = useRef();

    const products = (collection?.products?.edges || collection?.products?.edges || []).map(
        (edge, index) => {
            if (limit && index >= limit) return null;
            if (!edge?.node) return null;

            const product = edge.node;
            return (
                <ProductProvider key={product?.id} data={product}>
                    <ProductCard
                        handle={product?.handle}
                        isHorizontal={isHorizontal}
                        store={store}
                    />
                </ProductProvider>
            );
        }
    );

    const view_more = limit &&
        collection?.products?.edges &&
        collection.products.edges.length > limit && (
            <Link
                className="ProductCard CollectionBlock-Content-ShowMore"
                href={`/collections/${handle}`}
            >
                <LanguageString id={'see_all'} />
            </Link>
        );

    return (
        <Container horizontal={isHorizontal}>
            {!hideTitle && (
                <Meta>
                    <Link href={`/collections/${handle}`}>
                        <Title>{data?.title}</Title>
                    </Link>
                    <Subtitle
                        dangerouslySetInnerHTML={{
                            __html: data?.descriptionHtml || data?.seo?.description || ''
                        }}
                    />
                </Meta>
            )}
            <Content ref={content_ref as any} horizontal={isHorizontal}>
                {products.length > 0 && products}
                {view_more}
            </Content>
            {isHorizontal && (
                <Actions>
                    <Action
                        onClick={() => {
                            if (!content_ref?.current) return;
                            (content_ref.current as any).scroll?.({
                                left: (content_ref.current as any).scrollLeft - 150
                            });
                        }}
                    >
                        <FiChevronLeft />
                    </Action>
                    <Action
                        onClick={() => {
                            if (!content_ref?.current) return;
                            (content_ref.current as any).scroll?.({
                                left: (content_ref.current as any).scrollLeft + 150
                            });
                        }}
                    >
                        <FiChevronRight />
                    </Action>
                </Actions>
            )}
        </Container>
    );
};

export default CollectionBlock;

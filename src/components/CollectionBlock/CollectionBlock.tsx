import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import React, { FunctionComponent, useRef } from 'react';
import styled, { css } from 'styled-components';

import { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import { CollectionApi } from '../../api/collection';
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
`;
const Action = styled.div`
    font-size: 4rem;
    color: #404756;
    cursor: pointer;
    transition: 250ms ease-in-out;
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
            padding: 0px var(--block-padding-large);
            column: none;
            display: grid;
            overflow-x: auto;
            grid-template-columns: repeat(auto-fit, minmax(auto, 1fr));
            grid-auto-columns: auto;
            grid-template-rows: 1fr;
            grid-auto-flow: column;
            scroll-padding-left: var(--block-padding-large);

            &::-webkit-scrollbar {
                display: none;
            }
            scrollbar-width: none;
            -ms-overflow-style: none;

            .First {
                margin-left: var(--block-padding-large);
            }
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
                    max-width: 24rem;
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
            }
        `}
`;

const ViewMore = styled.section<{
    horizontal?: boolean;
}>`
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 18rem;
    border-radius: var(--block-border-radius);
    background: var(--accent-secondary);
    color: var(--accent-primary-dark);
    text-decoration: underline;
    text-decoration-style: dotted;
    text-decoration-thickness: 0.2rem;
    text-underline-offset: 0.25rem;
    font-size: 2rem;
    line-height: 2.5rem;
    font-weight: 600;
    text-align: center;
    scroll-snap-align: start;
    transition: 250ms ease-in-out;

    a {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        width: 100%;
        padding: var(--block-padding-large);
    }

    ${({ horizontal }) =>
        horizontal &&
        css`
            margin-right: calc(50vw - calc(18rem / 2) - 2.5rem);

            @media (min-width: 950px) {
                margin-right: 2.75rem;
            }
        `}

    span {
        font-weight: 700;
        color: var(--accent-primary-light);
        transition: 250ms ease-in-out;
    }

    &:hover {
        background: var(--accent-primary);
        color: var(--accent-secondary);

        span {
            color: var(--accent-secondary-light);
        }
    }
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
                <ProductProvider key={`minimal_${product?.id}`} data={product}>
                    <ProductCard
                        handle={product?.handle}
                        isHorizontal={isHorizontal}
                        store={store}
                        className={(index === 0 && 'First') || ''}
                    />
                </ProductProvider>
            );
        }
    );

    const view_more = limit &&
        collection?.products?.edges &&
        collection.products.edges.length > limit && (
            <ViewMore horizontal={isHorizontal}>
                <Link
                    className="ProductCard CollectionBlock-Content-ShowMore"
                    href={`/collections/${handle}`}
                >
                    <p>
                        View all <span>{collection.products.edges.length}</span> products in
                        the collection
                    </p>
                </Link>
            </ViewMore>
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

import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import styled, { css } from 'styled-components';
import { useEffect, useRef, useState } from 'react';

import type { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import { CollectionApi } from '@/api/collection';
import type { FunctionComponent } from 'react';
import Link from 'next/link';
import { ProductProvider } from '@shopify/hydrogen-react';
import type { StoreModel } from '@/models/StoreModel';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import useSWR from 'swr';

const ProductCard = dynamic(() => import('@/components/ProductCard'));

const Title = styled.div``;
const Subtitle = styled.div``;

const Actions = styled.div`
    position: absolute;
    z-index: 99999;
    top: 0;
    right: var(--block-padding);
    bottom: 0;
    left: var(--block-padding);
    display: grid;
    grid-template-areas: 'left right';
    justify-content: space-between;
    align-items: center;
    width: calc(100% - calc(var(--block-padding) * 2));
    pointer-events: none;
    user-select: none;

    @media (max-width: 950px) {
        display: none;
    }
`;
const Action = styled.div<{ $hide?: boolean; $position: 'left' | 'right' }>`
    z-index: 99999;
    grid-area: ${({ $position }) => $position};
    display: flex;
    justify-content: center;
    align-items: center;
    height: calc(var(--block-padding-large) * 2);
    width: calc(var(--block-padding-large) * 2);
    font-size: 2.5rem;
    text-align: center;
    color: var(--accent-secondary-text);
    cursor: pointer;
    transition: 250ms ease-in-out;
    pointer-events: all;

    background: var(--accent-secondary);
    border-radius: var(--block-border-radius);
    box-shadow: 0px 0px 1rem 0px var(--color-block-shadow);

    @media (hover: hover) and (pointer: fine) {
        &:hover,
        &:active {
            background: var(--accent-secondary-dark);
        }
    }

    ${({ $hide }) =>
        $hide &&
        css`
            opacity: 0;
            pointer-events: none;
        `}
`;

const Meta = styled.div``;

const Content = styled.div<{
    $horizontal?: boolean;
    $showLeftShadow?: boolean;
    $showRightShadow?: boolean;
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

            &::-webkit-scrollbar {
                display: none;
            }
            scrollbar-width: none;
            -ms-overflow-style: none;

            .First {
                margin-left: calc(var(--block-spacer-large));
            }

            &::after {
                content: '';
                position: absolute;
                top: 0px;
                right: 0px;
                bottom: 0px;
                left: 0px;
                height: 100%;
                transition: 250ms ease-in-out;
                pointer-events: none;

                --shadow-width: calc(var(--block-padding) * 2);
                --shadow: rgba(0, 0, 0, 0.5);
                background-image: linear-gradient(to right, transparent, transparent),
                    linear-gradient(to right, transparent, transparent),
                    ${({ $showLeftShadow }: any) =>
                        ($showLeftShadow && 'linear-gradient(to right, var(--shadow), transparent)') ||
                        'linear-gradient(to right, transparent, transparent)'},
                    ${({ $showRightShadow }: any) =>
                        ($showRightShadow && 'linear-gradient(to left, var(--shadow), transparent)') ||
                        'linear-gradient(to left, transparent, transparent)'};
                background-position:
                    left center,
                    right center,
                    left center,
                    right center;
                background-repeat: no-repeat;
                background-color: transparent;
                background-size:
                    var(--shadow-width) 100%,
                    var(--shadow-width) 100%,
                    var(--shadow-width) 100%,
                    var(--shadow-width) 100%;
                background-attachment: local, local, scroll, scroll;
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

    ${({ $horizontal }) =>
        $horizontal &&
        css`
            width: calc(100% + var(--block-padding-large) * 2);
            margin-left: calc(var(--block-padding-large) * -1);
        `}
`;

const ViewMore = styled.section<{
    $horizontal?: boolean;
}>`
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    width: var(--component-product-card-width);
    border-radius: var(--block-border-radius);
    background: var(--accent-secondary);
    color: var(--accent-primary-dark);
    text-decoration: underline;
    text-decoration-style: dotted;
    text-decoration-thickness: 0.2rem;
    text-underline-offset: var(--block-border-width);
    font-size: 2rem;
    line-height: 2.5rem;
    font-weight: 600;
    text-align: center;
    scroll-snap-align: start;
    transition: 250ms ease-in-out;
    user-select: none;

    a {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        width: 100%;
        padding: var(--block-padding-large);
    }

    ${({ $horizontal }) =>
        $horizontal &&
        css`
            margin-right: calc(
                50vw - calc(var(--component-product-card-width) / 2 + calc(var(--block-spacer-small) * 2))
            );

            @media (min-width: 950px) {
                margin-right: var(--block-padding-large);
            }
        `}

    span {
        font-weight: 700;
        color: var(--accent-primary-light);
        transition: 250ms ease-in-out;
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            background: var(--accent-primary);
            color: var(--accent-secondary);

            span {
                color: var(--accent-secondary-light);
            }
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
    data: collectionData,
    handle,
    limit,
    isHorizontal,
    store
}) => {
    const router = useRouter();
    const [shadowLeft, setShadowLeft] = useState(false);
    const [shadowRight, setShadowRight] = useState(false);

    const { data: collection } = useSWR(
        [
            'CollectionApi',
            {
                handle: handle || collectionData?.handle!,
                locale: router.locale
            }
        ],
        ([, props]) => CollectionApi(props),
        {
            fallbackData: collectionData
        }
    );

    const contentRef = useRef<HTMLDivElement>();
    useEffect(() => {
        if (!contentRef.current) return () => {};

        const onScroll = () => {
            const { scrollWidth = 0, scrollLeft = 0, offsetWidth = 0 } = contentRef.current || {};
            setShadowLeft(scrollLeft > 0);
            setShadowRight(scrollLeft + offsetWidth < scrollWidth);
        };

        onScroll();
        contentRef.current?.addEventListener('scroll', onScroll);
        return () => {
            contentRef.current?.removeEventListener('scroll', onScroll);
        };
    }, [contentRef.current]);

    const products = (collection?.products?.edges || []).map((edge, index) => {
        if (limit && index >= limit) return null;
        if (!edge?.node) return null;

        const product = edge.node;
        return (
            <ProductProvider key={`minimal_${product?.id}`} data={product}>
                <ProductCard handle={product?.handle} store={store} className={(index === 0 && 'First') || ''} />
            </ProductProvider>
        );
    });

    const view_more = limit && collection?.products?.edges && collection.products.edges.length > limit && (
        <ViewMore $horizontal={isHorizontal}>
            <Link
                title={`Browse all products in "${collection.title}"`}
                className="ProductCard CollectionBlock-Content-ShowMore"
                href={`/collections/${handle}/`}
            >
                <p>
                    View all <span>{collection.products.edges.length}</span> products in this collection
                </p>
            </Link>
        </ViewMore>
    );

    return (
        <Container $horizontal={isHorizontal}>
            {!hideTitle && (
                <Meta>
                    <Link href={`/collections/${handle}/`}>
                        <Title>{collection?.title}</Title>
                    </Link>
                    <Subtitle
                        dangerouslySetInnerHTML={{
                            __html: collection?.descriptionHtml || collection?.seo?.description || ''
                        }}
                    />
                </Meta>
            )}

            {isHorizontal && (
                <Actions>
                    <Action
                        $position={'left'}
                        $hide={!contentRef?.current || !shadowLeft}
                        onClick={() => {
                            if (!contentRef?.current) return;
                            contentRef.current.scroll?.({
                                left: contentRef.current.scrollLeft - 400
                            });
                        }}
                    >
                        <FiChevronLeft />
                    </Action>
                    <Action
                        $position={'right'}
                        $hide={!contentRef?.current || !shadowRight}
                        onClick={() => {
                            if (!contentRef?.current) return;
                            contentRef.current.scroll?.({
                                left: contentRef.current.scrollLeft + 400
                            });
                        }}
                    >
                        <FiChevronRight />
                    </Action>
                </Actions>
            )}

            <Content
                ref={contentRef as any}
                $horizontal={isHorizontal}
                $showLeftShadow={shadowLeft}
                $showRightShadow={shadowRight}
            >
                {products.length > 0 && products}
                {view_more}
            </Content>
        </Container>
    );
};

export default CollectionBlock;

import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import React, { FunctionComponent, useRef } from 'react';

import { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import { CollectionApi } from '../../api/collection';
import LanguageString from '../LanguageString';
import Link from '../Link';
import PageHeader from '../PageHeader';
import ProductCard from '../ProductCard';
import { ProductProvider } from '@shopify/hydrogen-react';
import { StoreModel } from '../../models/StoreModel';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import useSWR from 'swr';

const SubTitle = styled.div`
    margin: -0.5rem 0px 2rem 0px;
    color: #404756;
    font-size: 1.5rem;
    line-height: 2rem;

    h1 {
        font-weight: 600;
    }
`;

const Actions = styled.div`
    position: absolute;
    top: 3rem;
    right: -4rem;
    bottom: 0px;
    left: -4rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    pointer-events: none;

    @media (max-width: 1500px) {
        display: none;
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
const CollectionBlock: FunctionComponent<CollectionBlockProps> = (props) => {
    const router = useRouter();

    const { data } = useSWR(
        props.handle ? [`${props.handle}`] : null,
        ([url]) => CollectionApi({ handle: url, locale: router.locale }),
        {
            fallbackData: props?.data
        }
    );

    const content_ref = useRef();

    const products = (data?.products?.edges || props?.data?.products?.edges || []).map(
        (edge, index) => {
            if (props.limit && index >= props.limit) return null;
            if (!edge?.node) return null;

            const product = edge.node;
            return (
                <ProductProvider key={product?.id} data={product}>
                    <ProductCard
                        handle={product?.handle}
                        isHorizontal={props.isHorizontal}
                        store={props.store}
                    />
                </ProductProvider>
            );
        }
    );

    const view_more = props.limit &&
        data?.products?.edges &&
        data.products.edges.length > props.limit && (
            <Link
                className="ProductCard CollectionBlock-Content-ShowMore"
                to={`/collections/${props.handle}`}
            >
                <LanguageString id={'see_all'} />
            </Link>
        );

    return (
        <div
            className={`CollectionBlock ${
                props.isHorizontal ? 'CollectionBlock-Horizontal' : 'CollectionBlock-Grid'
            }`}
        >
            {!props.hideTitle && (
                <div className="CollectionBlock-Header">
                    <PageHeader
                        title={
                            (props.noLink && data?.title) || (
                                <Link
                                    to={`/collections/${props.handle}`}
                                    as={'/collections/[handle]'}
                                >
                                    {data?.title}
                                </Link>
                            )
                        }
                        noMargin
                        plainTitle={props.plainTitle}
                    />
                    {props?.showDescription && (
                        <SubTitle
                            dangerouslySetInnerHTML={{
                                __html: data?.descriptionHtml || ''
                            }}
                        ></SubTitle>
                    )}
                </div>
            )}
            <div className="CollectionBlock-Content" ref={content_ref as any}>
                {products.length > 0 && products}
                {view_more}
            </div>
            {props.isHorizontal && (
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
        </div>
    );
};

export default CollectionBlock;

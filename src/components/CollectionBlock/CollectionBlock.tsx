import React, { FunctionComponent } from 'react';

import { CollectionApi } from '../../api/collection';
import ErrorPage from 'next/error';
import LanguageString from '../LanguageString';
import Link from '../Link';
import PageHeader from '../PageHeader';
import ProductCard from '../ProductCard';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import useSWR from 'swr';

const SubTitle = styled.h2`
    margin: -0.5rem 0px 2rem 0px;
    color: #404756;
    font-size: 1.65rem;
    line-height: 2rem;

    h1 {
        font-weight: 600;
    }
`;

interface CollectionBlockProps {
    handle?: string;
    limit?: number;
    data?: any;
    country?: string;
    hideTitle?: boolean;
    noLink?: boolean;

    isHorizontal?: boolean;
    showDescription?: boolean;
    brand?: boolean;
    search?: boolean;
    plainTitle?: boolean;
}
const CollectionBlock: FunctionComponent<CollectionBlockProps> = (props) => {
    const {
        data,
        error
    }: {
        data?: any;
        error?: any;
    } = useSWR(
        props.handle ? [`${props.handle}`] : null,
        (url) => CollectionApi(url),
        { fallbackData: props?.data }
    );

    if (error?.message === '404') return <ErrorPage statusCode={404} />;

    const router = useRouter();

    const products = (data?.items || props?.data?.items || []).map(
        (item, index) => {
            if (props.limit && index >= props.limit) return null;

            return (
                <ProductCard
                    key={item?.handle || item}
                    handle={item?.handle || item}
                    data={typeof item !== 'string' ? item : null}
                    isHorizontal={props.isHorizontal}
                />
            );
        }
    );

    const view_more =
        (props.limit && data?.items?.length && (
            <Link
                className="ProductCard CollectionBlock-Content-ShowMore"
                to={`/collections/${props.handle}`}
            >
                <LanguageString id={'see_all'} />
            </Link>
        )) ||
        null;

    return (
        <div
            className={`CollectionBlock ${
                props.isHorizontal
                    ? 'CollectionBlock-Horizontal'
                    : 'CollectionBlock-Grid'
            }`}
        >
            {!props.hideTitle && (
                <div className="CollectionBlock-Header">
                    <PageHeader
                        title={
                            props.noLink ? (
                                <h2>{data?.title}</h2>
                            ) : (
                                <Link
                                    to={`/collections/${props.handle}`}
                                    as={'/collections/[handle]'}
                                >
                                    {router.pathname == '/' ? (
                                        <h1>{data?.title}</h1>
                                    ) : (
                                        <h2>{data?.title}</h2>
                                    )}
                                </Link>
                            )
                        }
                        plainTitle={props.plainTitle}
                    />
                    {props?.showDescription && (
                        <SubTitle
                            dangerouslySetInnerHTML={{
                                __html: data?.body
                            }}
                        ></SubTitle>
                    )}
                </div>
            )}
            <div className="CollectionBlock-Content">
                {(products.length && products) ||
                    (!error && (
                        <>
                            <ProductCard />
                            <ProductCard />
                            <ProductCard />
                            <ProductCard />
                            <ProductCard />
                        </>
                    ))}
                {view_more}
            </div>
        </div>
    );
};

export default CollectionBlock;

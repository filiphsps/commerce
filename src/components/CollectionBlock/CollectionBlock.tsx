import React, { FunctionComponent, memo } from 'react';

import { CollectionApi } from '../../api';
import ErrorPage from 'next/error';
import LanguageString from '../LanguageString';
import Link from '../Link';
import Markdown from 'react-markdown';
import ProductCard from '../ProductCard';
import useSWR from 'swr';

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
}
const CollectionBlock: FunctionComponent<CollectionBlockProps> = (props) => {
    const language = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE;
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

    const products = (data?.items || props?.data?.items || []).map(
        (item, index) => {
            if (props.limit && index >= props.limit) return null;

            return (
                <ProductCard
                    key={item?.handle || item}
                    handle={item?.handle || item}
                    data={typeof item !== 'string' ? item : null}
                    search={props?.search}
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
                    {!props.noLink ? (
                        <Link
                            to={`/collections/${props.handle}`}
                            as={'/collections/[handle]'}
                        >
                            <h2 className="CollectionBlock-Header-Title">
                                {data?.title &&
                                    (data?.title[language] ||
                                        data?.title['en_US'] ||
                                        data?.title)}
                            </h2>
                        </Link>
                    ) : (
                        <h1 className="CollectionBlock-Header-Title">
                            {data?.title &&
                                (data?.title[language] ||
                                    data?.title['en_US'] ||
                                    data?.title)}
                        </h1>
                    )}

                    {props?.showDescription && (
                        <div className="CollectionBlock-Header-Description">
                            <Markdown
                                source={
                                    (data?.body &&
                                        (data?.body[language] ||
                                            data?.body['en_US'] ||
                                            data?.body)) ||
                                    data?.description ||
                                    ''
                                }
                            />
                        </div>
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

export default memo(CollectionBlock);

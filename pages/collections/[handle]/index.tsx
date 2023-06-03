import * as Sentry from '@sentry/nextjs';

import { CollectionApi, CollectionsApi } from '../../../src/api/collection';
import React, { FunctionComponent, useEffect } from 'react';

import Breadcrumbs from '../../../src/components/Breadcrumbs';
import { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import CollectionBlock from '../../../src/components/CollectionBlock';
import { CollectionModel } from '../../../src/models/CollectionModel';
import { Config } from '../../../src/util/Config';
import Content from '../../../src/components/Content';
import Error from 'next/error';
import Head from 'next/head';
import Image from 'next/legacy/image';
import { NextSeo } from 'next-seo';
import Page from '../../../src/components/Page';
import PageContent from '../../../src/components/PageContent';
import PageHeader from '../../../src/components/PageHeader';
import { StoreModel } from '../../../src/models/StoreModel';
import Vendors from '../../../src/components/Slices/components/Vendors';
import { VendorsApi } from '../../../src/api/vendor';
import styled from 'styled-components';
import { useRouter } from 'next/router';

const Body = styled(Content)`
    margin-top: 2rem;
`;

const Banner = styled.div`
    overflow: hidden;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    height: 14rem;
    padding: 2rem;
    margin-bottom: 1rem;
    background: #efefef;
    border-radius: var(--block-border-radius);
`;
const BannerMeta = styled.div`
    overflow: hidden;
`;
const BannerDescription = styled.div`
    max-width: 24rem;
    font-size: 1.25rem;
`;
const BannerTitle = styled.h2`
    text-transform: uppercase;
    font-weight: 700;
    font-size: 2.5rem;
    color: #404756;
`;
const BannerImage = styled.div`
    height: 100%;
    width: 10rem;
    padding: 1rem;
    background: #fefefe;
    border-radius: var(--block-border-radius);
`;
const BannerImageWrapper = styled.div`
    height: 100%;
    position: relative;

    img {
        object-fit: contain;
        mix-blend-mode: multiply;
    }
`;

interface CollectionPageProps {
    store: StoreModel;
    collection: Collection;
}
const CollectionPage: FunctionComponent<CollectionPageProps> = ({ store, collection }) => {
    const router = useRouter();

    if (!collection) return <Error statusCode={404} />;

    return (
        <Page className="CollectionPage">
            <NextSeo
                title={collection?.seo?.title || collection?.title}
                description={collection?.seo?.description || collection?.description || undefined}
                additionalMetaTags={
                    ((collection as any).keywords?.value && [
                        {
                            property: 'keywords',
                            content: (collection as any).keywords?.value
                        }
                    ]) ||
                    []
                }
            />
            <Head>
                <link
                    rel="canonical"
                    href={`https://${Config.domain}/collections/${collection.handle}/`}
                />
            </Head>

            <PageContent
                style={{
                    margin: '1rem auto 2rem auto'
                }}
            >
                <Breadcrumbs
                    pages={[
                        {
                            title: collection?.title || router.query.handle,
                            url: `/collections/${router.query.handle}`
                        }
                    ]}
                    store={store}
                />

                <PageHeader title={collection.title} plainTitle />

                <CollectionBlock
                    handle={`${router.query.handle}`}
                    data={collection}
                    noLink
                    hideTitle
                    store={store}
                />

                <Body
                    dangerouslySetInnerHTML={{
                        __html: collection?.descriptionHtml || ''
                    }}
                />
            </PageContent>
            <Vendors />
        </Page>
    );
};

export async function getStaticPaths({ locales }) {
    const collections = await CollectionsApi();

    let paths = [
        ...collections
            ?.map((collection) => [
                {
                    params: { handle: collection?.handle }
                },
                ...locales.map((locale) => ({
                    params: { handle: collection?.handle },
                    locale: locale
                }))
            ])
            .flat()
            .filter((a) => a?.params?.handle && a.locale !== '__default')
    ];

    return { paths, fallback: true };
}

export async function getStaticProps({ params, locale }) {
    let handle = '';
    if (Array.isArray(params.handle)) {
        handle = params?.handle?.join('');
    } else {
        handle = params?.handle;
    }

    if (handle === 'undefined' || !handle)
        return {
            notFound: true,
            revalidate: false
        };

    if (locale === '__default') {
        return {
            props: {},
            revalidate: false
        };
    }

    let collection: Collection | null = null;
    let vendors;

    try {
        collection = await CollectionApi(handle);
    } catch (error) {
        Sentry.captureException(error);
    }

    try {
        vendors = await VendorsApi();
    } catch (error) {
        Sentry.captureException(error);
    }

    return {
        props: {
            collection: collection,
            vendors: vendors ?? null,
            analytics: {
                pageType: 'collection',
                resourceId: collection?.id
            }
        },
        revalidate: 10
    };
}

export default CollectionPage;

import { CollectionApi, CollectionsApi } from '../../../src/api/collection';
import React, { FunctionComponent, useEffect } from 'react';

import Breadcrumbs from '../../../src/components/Breadcrumbs';
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
    data: {
        collection: CollectionModel;
    };
}
const CollectionPage: FunctionComponent<CollectionPageProps> = (props) => {
    const { store, data } = props;

    const router = useRouter();

    useEffect(() => {
        if (!data?.collection) return;

        if (window) (window as any).resourceId = collection?.id;
    }, [data?.collection]);

    if (!data || !data?.collection) return <Error statusCode={404} />;

    const { collection } = data;

    return (
        <Page className="CollectionPage">
            <NextSeo
                title={collection?.seo?.title || collection?.title}
                description={
                    collection?.seo?.description ||
                    collection?.body ||
                    (data as any)?.collection?.description ||
                    null
                }
                additionalMetaTags={
                    collection.seo?.keywords
                        ? [
                              {
                                  property: 'keywords',
                                  content: collection.seo?.keywords
                              }
                          ]
                        : []
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

                {collection.is_brand && collection.image ? (
                    <Banner>
                        <BannerMeta>
                            <BannerTitle>{collection.title}</BannerTitle>
                            <BannerDescription>
                                {collection.seo?.description?.slice(0, 125)}...
                            </BannerDescription>
                        </BannerMeta>
                        <BannerImage>
                            <BannerImageWrapper>
                                <Image
                                    src={collection.image.src}
                                    alt={collection.image.alt}
                                    layout="fill"
                                />
                            </BannerImageWrapper>
                        </BannerImage>
                    </Banner>
                ) : (
                    <PageHeader title={collection.title} plainTitle />
                )}

                <CollectionBlock
                    handle={`${router.query.handle}`}
                    data={collection}
                    noLink
                    hideTitle
                    store={store}
                />

                <Body
                    dangerouslySetInnerHTML={{
                        __html: collection?.body || ''
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

    let collection, vendors;

    try {
        collection = await CollectionApi(handle);
    } catch (err) {
        console.error('CollectionApi', err);
    }

    try {
        vendors = await VendorsApi();
    } catch (err) {
        console.error('VendorsApi', err);
    }

    return {
        props: {
            data: {
                collection: collection ?? null,
                vendors: vendors ?? null
            }
        },
        revalidate: 10
    };
}

export default CollectionPage;

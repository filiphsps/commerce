import { CollectionApi, CollectionsApi } from '../../../src/api/collection';
import React, { FunctionComponent, useEffect } from 'react';

import Breadcrumbs from '../../../src/components/Breadcrumbs';
import CollectionBlock from '../../../src/components/CollectionBlock';
import { CollectionModel } from '../../../src/models/CollectionModel';
import Error from 'next/error';
import { NextSeo } from 'next-seo';
import Page from '../../../src/components/Page';
import PageContent from '../../../src/components/PageContent';
import { StoreModel } from '../../../src/models/StoreModel';
import Vendors from '../../../src/components/Slices/components/Vendors';
import { VendorsApi } from '../../../src/api/vendor';
import { useRouter } from 'next/router';

interface CollectionPageProps {
    store: StoreModel;
    data: {
        collection: CollectionModel;
    };
}
const CollectionPage: FunctionComponent<CollectionPageProps> = (props) => {
    const { store, data } = props;
    const { collection } = data;

    const router = useRouter();

    useEffect(() => {
        if (!data?.collection) return;

        if (window) (window as any).resourceId = collection?.id;
    }, [data?.collection]);

    if (!data?.collection) return <Error statusCode={404} />;

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
                        : null
                }
            />

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

                <CollectionBlock
                    handle={`${router.query.handle}`}
                    data={collection}
                    showDescription
                    noLink
                />
            </PageContent>
            <Vendors data={{ theme: 'dark' }} />
        </Page>
    );
};

export async function getStaticPaths() {
    const collections = await CollectionsApi();

    let paths = [
        ...collections
            ?.map((collection) => ({
                params: { handle: collection?.handle }
            }))
            .filter((a) => a.params.handle)
    ];

    return { paths, fallback: 'blocking' };
}

export async function getStaticProps({ locale, params }) {
    let handle = '';
    if (Array.isArray(params.handle)) {
        handle = params?.handle?.join('');
    } else {
        handle = params?.handle;
    }

    if (handle === 'undefined' || !handle)
        return {
            props: {
                data: {
                    collection: null
                }
            },
            revalidate: false
        };

    let collection, vendors;

    try {
        collection = await CollectionApi(handle);
    } catch (err) {
        console.error(err);
    }

    try {
        vendors = await VendorsApi();
    } catch (err) {
        console.error(err);
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

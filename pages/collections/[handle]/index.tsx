import React, { FunctionComponent, useEffect } from 'react';

import Breadcrumbs from '../../../src/components/Breadcrumbs';
import { CollectionApi } from '../../../src/api/collection';
import CollectionBlock from '../../../src/components/CollectionBlock';
import { CollectionModel } from '../../../src/models/CollectionModel';
import Error from 'next/error';
import { NextSeo } from 'next-seo';
import Page from '../../../src/components/Page';
import PageContent from '../../../src/components/PageContent';
import { StoreModel } from '../../../src/models/StoreModel';
import Vendors from '../../../src/components/Slices/components/Vendors';
import { VendorsApi } from '../../../src/api/vendor';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
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
    const vendors = ((await VendorsApi()) as any) || null;

    let paths = [
        ...vendors
            ?.map((vendor) => ({
                params: { handle: vendor?.handle }
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

    if (handle === 'undefined')
        return {
            revalidate: false
        };

    return {
        props: {
            ...(await serverSideTranslations(locale, ['common', 'product'])),
            data: {
                collection: (await CollectionApi(handle)) ?? null,
                vendors: (await VendorsApi()) ?? null
            }
        },
        revalidate: 1
    };
}

export default CollectionPage;

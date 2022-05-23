import React, { FunctionComponent, useEffect } from 'react';

import Breadcrumbs from '../../../src/components/Breadcrumbs';
import { CollectionApi } from '../../../src/api/collection';
import CollectionBlock from '../../../src/components/CollectionBlock';
import { CollectionModel } from '../../../src/models/CollectionModel';
import Error from 'next/error';
import Head from 'next/head';
import Page from '../../../src/components/Page';
import PageContent from '../../../src/components/PageContent';
import { StoreModel } from '../../../src/models/StoreModel';
import Vendors from '../../../src/components/Vendors';
import { VendorsApi } from '../../../src/api/vendor';
import { useRouter } from 'next/router';

interface CollectionPageProps {
    store: StoreModel;
    data: CollectionModel;
}
const CollectionPage: FunctionComponent<CollectionPageProps> = (props: any) => {
    const { store, data } = props;

    const router = useRouter();

    useEffect(() => {
        if (!data?.collection) return;

        if (window) (window as any).resourceId = data?.collection?.id;
    }, [data?.collection]);

    if (!data?.collection) return <Error statusCode={404} />;

    return (
        <Page className="CollectionPage">
            <Head>
                {data?.collection?.title && (
                    <title>
                        {data?.collection?.title} | {store?.name || ''}
                    </title>
                )}
                <meta
                    name="description"
                    content={data?.body || data?.description || ''}
                />
            </Head>

            <PageContent
                style={{
                    marginTop: '1rem'
                }}
            >
                <Breadcrumbs
                    pages={[
                        {
                            title: props.data?.title || router.query.handle,
                            url: '/collections/' + router.query.handle
                        }
                    ]}
                    store={store}
                />

                <Vendors data={props?.data?.vendors} />
                <CollectionBlock
                    handle={`${router.query.handle}`}
                    data={data?.collection}
                    showDescription
                    noLink
                />
            </PageContent>
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

export async function getStaticProps({ params }) {
    let handle = '';
    if (Array.isArray(params.handle)) {
        handle = params?.handle?.join('');
    } else {
        handle = params?.handle;
    }

    return {
        props: {
            data: {
                collection: (await CollectionApi(handle)) ?? null,
                vendors: (await VendorsApi()) ?? null
            }
        },
        revalidate: 1
    };
}

export default CollectionPage;

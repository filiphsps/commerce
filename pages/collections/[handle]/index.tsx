import { CollectionApi, VendorsApi } from '../../../src/api';
import React, { FunctionComponent, useEffect } from 'react';

import Breadcrumbs from '../../../src/components/Breadcrumbs';
import CollectionBlock from '../../../src/components/CollectionBlock';
import { CollectionModel } from '../../../src/models/CollectionModel';
import Head from 'next/head';
import Page from '../../../src/components/Page';
import PageContent from '../../../src/components/PageContent';
import { StoreModel } from '../../../src/models/StoreModel';
import Vendors from '../../../src/components/Vendors';
import { useRouter } from 'next/router';

interface CollectionPageProps {
    store: StoreModel;
    data: CollectionModel;
}
const CollectionPage: FunctionComponent<CollectionPageProps> = (props: any) => {
    const { store, data } = props;
    const language = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE;

    const router = useRouter();

    useEffect(() => {
        if (!data?.collection) return;

        if (window) (window as any).resourceId = data?.collection?.id;
    }, [data?.collection]);

    return (
        <Page className="CollectionPage">
            <Head>
                <title>
                    {props.data?.title || router.query.handle} |{' '}
                    {store?.name || ''}
                </title>
                <meta
                    name="description"
                    content={
                        (data?.body &&
                            (data?.body[language] ||
                                data?.body['en_US'] ||
                                data?.body)) ||
                        data?.description ||
                        ''
                    }
                />
            </Head>

            <PageContent>
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
    return { paths: [], fallback: true };
}

export async function getStaticProps({ params }) {
    try {
        return {
            props: {
                data: {
                    collection:
                        (await CollectionApi(params?.handle?.join(''))) ?? null,
                    vendors: (await VendorsApi()) ?? null
                }
            },
            revalidate: 1
        };
    } catch (err) {
        return {
            props: {},
            revalidate: 1
        };
    }
}

export default CollectionPage;

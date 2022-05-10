import { CollectionApi, VendorsApi } from '../../../src/api';

import Breadcrumbs from '../../../src/components/Breadcrumbs';
import CollectionBlock from '../../../src/components/CollectionBlock';
import Head from 'next/head';
import Page from '../../../src/components/Page';
import PageContent from '../../../src/components/PageContent';
import React from 'react';
import { VendorModel } from '../../../src/models/VendorModel';
import Vendors from '../../../src/components/Vendors';
import { useRouter } from 'next/router';

const BrandPage = (props: any) => {
    const { store } = props;

    const router = useRouter();

    // Redirect to /collections
    router.replace(router.asPath.replace('brands', 'collections'));

    return (
        <Page className="CollectionPage">
            <Head>
                <title>
                    {props.data?.title || router.query.handle} |{' '}
                    {store?.name || ''}
                </title>
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
                    data={props?.data?.collection}
                    showDescription
                    brand
                    noLink
                />
            </PageContent>
        </Page>
    );
};

export async function getStaticPaths() {
    try {
        const vendors = (await VendorsApi()) as Array<VendorModel>;

        const paths =
            vendors?.map((vendor) => ({
                params: { handle: vendor?.handle }
            })) || [];

        return { paths, fallback: true };
    } catch {
        return { paths: [], fallback: true };
    }
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

export default BrandPage;

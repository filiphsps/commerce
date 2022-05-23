import Head from 'next/head';
import Page from '../src/components/Page';
import { PageApi } from '../src/api/page';
import { Prefetch } from '../src/util/Prefetch';
import React from 'react';
import Slices from '../src/components/Slices';

const HomePage = (props: any) => {
    const { store, data } = props;

    return (
        <Page className="HomePage">
            <Head>
                <title>
                    {data?.page?.title} | {store?.name}
                </title>
                <meta
                    name="description"
                    content={
                        data?.page?.description || store?.description || ''
                    }
                />
            </Head>
            <Slices
                store={store}
                data={data?.page?.body}
                prefetch={data?.prefetch}
            />
        </Page>
    );
};

export async function getStaticProps({ query, locale }) {
    const page = (await PageApi('home', locale)) as any;
    const prefetch = page && (await Prefetch(page, query));

    return {
        props: {
            data: {
                page,
                prefetch
            }
        },
        revalidate: 5
    };
}

export default HomePage;

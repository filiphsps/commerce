import Head from 'next/head';
import Page from '../src/components/Page';
import { PageApi } from '../src/api';
import PageLoader from '../src/components/PageLoader';
import { Prefetch } from '../src/util/Prefetch';
import React from 'react';
import Slices from '../src/components/Slices';
import { useRouter } from 'next/router';
import useSWR from 'swr';

const HomePage = (props: any) => {
    const { store } = props;
    const language = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE;
    const router = useRouter();

    const { data, error } = useSWR(
        [`home`],
        (url) => PageApi(url, router.locale) as any,
        {
            fallbackData: props?.data?.page
        }
    );

    const title =
        data?.title?.[language] || data?.title?.['en_US'] || data?.title;
    return (
        <Page className="HomePage">
            <Head>
                {(title &&
                    title?.toLowerCase() === store?.name?.toLowerCase() && (
                        <title>{store?.name}</title>
                    )) || (
                    <title>
                        {title} | {store?.name}
                    </title>
                )}
                <meta
                    name="description"
                    content={
                        data?.description?.[language] ||
                        data?.description?.['en_US'] ||
                        data?.description ||
                        store?.description ||
                        ''
                    }
                />
            </Head>

            {(data && (
                <Slices
                    store={store}
                    data={data?.body}
                    prefetch={props?.data?.prefetch}
                />
            )) || <PageLoader />}
        </Page>
    );
};

export async function getStaticProps({ query, locale }) {
    try {
        const page = ((await PageApi('home', locale)) as any) ?? null;
        const prefetch = (page && (await Prefetch(page, query))) || null;

        return {
            props: {
                data: {
                    page,
                    prefetch
                }
            },
            revalidate: 1
        };
    } catch (error) {
        return {
            props: {},
            revalidate: 1
        };
    }
}

export default HomePage;

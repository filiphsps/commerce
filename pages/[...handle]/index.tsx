import { PageApi, PagesApi } from '../../src/api/page';

import Breadcrumbs from '../../src/components/Breadcrumbs';
import ErrorPage from 'next/error';
import Head from 'next/head';
import LanguageString from '../../src/components/LanguageString';
import Page from '../../src/components/Page';
import PageContent from '../../src/components/PageContent';
import PageHeader from '../../src/components/PageHeader';
import PageLoader from '../../src/components/PageLoader';
import { Prefetch } from '../../src/util/Prefetch';
import React from 'react';
import Slices from '../../src/components/Slices';
import { useRouter } from 'next/router';

const CustomPage = (props: any) => {
    const { store } = props;
    const router = useRouter();

    const data = props?.data?.page;

    if (!data) return <ErrorPage statusCode={404} />;

    return (
        <Page className={`CustomPage CustomPage-${data?.type}`}>
            <Head>
                <title>
                    {data?.title} | {store?.name}
                </title>
                <meta name="description" content={data?.description || ''} />
            </Head>

            <PageContent>
                <Breadcrumbs
                    pages={(router.query.handle as string[])?.map((item) => {
                        return {
                            title: <LanguageString id={item} />,
                            url: `/${item}`
                        };
                    })}
                    store={store}
                />
                <PageHeader
                    title={data?.title}
                    description={data?.description}
                />
            </PageContent>
            {(data && (
                <Slices
                    store={store}
                    data={data?.slices || data?.body}
                    prefetch={props?.data?.prefetch}
                />
            )) || <PageLoader />}
        </Page>
    );
};

export async function getStaticPaths() {
    const pages = (await PagesApi()) as any;

    let paths = [
        ...pages
            ?.map((page) => {
                return { params: { handle: [page] } };
            })
            .filter((a) => a.params.handle && a.params.handle != 'home')
    ];

    return { paths, fallback: 'blocking' };
}

export async function getStaticProps({ params, locale }) {
    const page =
        ((await PageApi(params?.handle?.join('/'), locale)) as any) || null;
    const prefetch = (page && (await Prefetch(page, params))) || null;

    return {
        props: {
            handle: params?.handle?.join('/'),
            data: {
                page,
                prefetch
            }
        },
        revalidate: 1
    };
}

export default CustomPage;

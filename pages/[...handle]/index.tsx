import * as Sentry from '@sentry/nextjs';

import { PageApi, PagesApi } from '../../src/api/page';
import React, { FunctionComponent } from 'react';

import Breadcrumbs from '../../src/components/Breadcrumbs';
import { Config } from '../../src/util/Config';
import ErrorPage from 'next/error';
import LanguageString from '../../src/components/LanguageString';
import { NextSeo } from 'next-seo';
import Page from '../../src/components/Page';
import PageContent from '../../src/components/PageContent';
import PageHeader from '../../src/components/PageHeader';
import PageLoader from '../../src/components/PageLoader';
import type { PageModel } from '../../src/models/PageModel';
import { Prefetch } from '../../src/util/Prefetch';
import Slices from '../../src/components/Slices';
import type { StoreModel } from '../../src/models/StoreModel';
import { useRouter } from 'next/router';

interface CustomPageProps {
    store: StoreModel;
    data: {
        page: PageModel;
        prefetch: any;
    };
}
const CustomPage: FunctionComponent<CustomPageProps> = (props) => {
    const { store } = props;
    const router = useRouter();

    const data = props?.data?.page;

    if (!data) return <ErrorPage statusCode={404} />;

    return (
        <Page className={`CustomPage CustomPage-${data?.type}`}>
            <NextSeo
                title={data?.title}
                description={data?.description || ''}
                canonical={`https://${Config.domain}${router.asPath}`}
                additionalMetaTags={
                    data?.keywords
                        ? [
                              {
                                  property: 'keywords',
                                  content: data?.keywords
                              }
                          ]
                        : []
                }
            />

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
                <PageHeader title={data?.title} subtitle={data?.description} />
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

export async function getStaticPaths({ locales }) {
    const pages = (await PagesApi()) as any;

    let paths = [
        ...pages
            ?.map((page) => [
                {
                    params: { handle: [page] }
                },
                ...locales.map((locale) => ({
                    params: { handle: [page] },
                    locale: locale
                }))
            ])
            .flat()
            .filter((a) => a?.params?.handle)
            .filter(
                (a) => a.params.handle != 'home' && a.params.handle != 'shop'
            )
    ];
    return { paths, fallback: true };
}

export async function getStaticProps({ params, locale }) {
    try {
        const page =
            ((await PageApi(
                params?.handle?.join('/'),
                locale === '__default' ? Config.i18n.locales[0] : locale
            )) as any) || null;
        const prefetch = (page && (await Prefetch(page, params))) || null;

        return {
            props: {
                handle: params?.handle?.join('/'),
                data: {
                    page,
                    prefetch
                }
            },
            revalidate: 10
        };
    } catch (error) {
        Sentry.captureException(error);
        console.error(error);

        return {
            props: {},
            revalidate: 1
        };
    }
}

export default CustomPage;

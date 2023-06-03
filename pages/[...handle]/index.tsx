import * as Sentry from '@sentry/nextjs';

import { PageApi, PagesApi } from '../../src/api/page';
import React, { FunctionComponent } from 'react';

import Breadcrumbs from '../../src/components/Breadcrumbs';
import { Config } from '../../src/util/Config';
import Error from 'next/error';
import LanguageString from '../../src/components/LanguageString';
import { NextSeo } from 'next-seo';
import Page from '../../src/components/Page';
import PageContent from '../../src/components/PageContent';
import PageHeader from '../../src/components/PageHeader';
import type { PageModel } from '../../src/models/PageModel';
import { Prefetch } from '../../src/util/Prefetch';
import Slices from '../../src/components/Slices';
import type { StoreModel } from '../../src/models/StoreModel';
import { useRouter } from 'next/router';

interface CustomPageProps {
    store: StoreModel;
    page: PageModel;
    prefetch: any;
    error?: string;
}
const CustomPage: FunctionComponent<CustomPageProps> = ({ store, page, prefetch, error }) => {
    const router = useRouter();

    if (error || !page) return <Error statusCode={500} title={error} />;

    return (
        <Page className={`CustomPage CustomPage-${page?.type}`}>
            <NextSeo
                title={page?.title}
                description={page?.description || ''}
                canonical={`https://${Config.domain}${router.asPath}`}
                additionalMetaTags={
                    (page?.keywords && [
                        {
                            property: 'keywords',
                            content: page?.keywords
                        }
                    ]) ||
                    []
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
                <PageHeader title={page?.title} subtitle={page?.description} />
            </PageContent>
            <Slices store={store} data={page?.slices || page?.body} prefetch={prefetch} />
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
            .filter((a) => a.params.handle != 'home' && a.params.handle != 'shop')
    ];
    return { paths, fallback: true };
}

export async function getStaticProps({ params, locale }) {
    try {
        const page = ((await PageApi(params?.handle?.join('/'), locale)) as any) || null;
        const prefetch = (page && (await Prefetch(page, params))) || null;

        return {
            props: {
                handle: params?.handle?.join('/'),
                page,
                prefetch,
                analytics: {
                    pageType: 'page'
                }
            },
            revalidate: 10
        };
    } catch (error) {
        if (error.message?.includes('404')) {
            return {
                notFound: true
            };
        }

        Sentry.captureException(error);
        return {
            props: {},
            revalidate: 1
        };
    }
}

export default CustomPage;

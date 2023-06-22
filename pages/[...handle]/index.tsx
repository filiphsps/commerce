import * as Sentry from '@sentry/nextjs';

import React, { FunctionComponent } from 'react';

import Breadcrumbs from '../../src/components/Breadcrumbs';
import { Config } from '../../src/util/Config';
import { CustomPageDocument } from '../../prismicio-types';
import Error from 'next/error';
import LanguageString from '../../src/components/LanguageString';
import { NextSeo } from 'next-seo';
import Page from '../../src/components/Page';
import PageContent from '../../src/components/PageContent';
import PageHeader from '../../src/components/PageHeader';
import { PagesApi } from '../../src/api/page';
import { Prefetch } from '../../src/util/Prefetch';
import { SliceZone } from '@prismicio/react';
import type { StoreModel } from '../../src/models/StoreModel';
import { asText } from '@prismicio/client';
import { components } from '../../slices';
import { createClient } from '../../prismicio';
import { useRouter } from 'next/router';

interface CustomPageProps {
    store: StoreModel;
    prefetch: any;
    page: CustomPageDocument<string>;
    error?: string;
}
const CustomPage: FunctionComponent<CustomPageProps> = ({ store, prefetch, page, error }) => {
    const router = useRouter();

    if (error || !page) return <Error statusCode={500} title={error} />;

    return (
        <Page className={`CustomPage CustomPage-${page?.type}`}>
            <NextSeo
                title={page.data.meta_title || page.data.title || ''}
                description={asText(page.data.meta_description) || page.data.description || ''}
                canonical={`https://${Config.domain}${router.asPath}`}
                languageAlternates={
                    router?.locales
                        ?.filter((locale) => locale !== '__default')
                        .map((locale) => ({
                            hrefLang: locale,
                            href: `https://${Config.domain}/${locale}${router.asPath}`
                        })) || []
                }
                additionalMetaTags={
                    (page.data.keywords && [
                        {
                            property: 'keywords',
                            content: page.data.keywords
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
                <PageHeader title={page.data.title} subtitle={page.data.description} />
            </PageContent>
            <SliceZone
                slices={page.data.slices}
                components={components}
                context={{ prefetch, store }}
            />
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
            .filter((a) => a.params.handle != 'homepage' && a.params.handle != 'shop')
    ];
    return { paths, fallback: true };
}

export async function getStaticProps({ params, locale, previewData }) {
    try {
        const client = createClient({ previewData });
        let page: any = null;
        try {
            page = await client.getByUID('custom_page', params?.handle?.join('/'), {
                lang: locale
            });
        } catch {
            page = await client.getByUID('custom_page', params?.handle?.join('/'));
        }
        const prefetch = (page && (await Prefetch(page, params, locale))) || null;

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
        if (error.message?.includes('No documents')) {
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

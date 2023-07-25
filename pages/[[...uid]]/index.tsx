import * as Sentry from '@sentry/nextjs';

import { AnalyticsPageType } from '@shopify/hydrogen-react';
import { Config } from '../../src/util/Config';
import { CustomPageDocument } from '../../prismicio-types';
import { FunctionComponent } from 'react';
import { GetStaticProps } from 'next';
import { NextSeo } from 'next-seo';
import Page from '@/components/Page';
import PageContent from '@/components/PageContent';
import { PagesApi } from '../../src/api/page';
import { Prefetch } from '../../src/util/Prefetch';
import type { StoreModel } from '../../src/models/StoreModel';
import { asText } from '@prismicio/client';
import { components } from '../../slices';
import { createClient } from '../../prismicio';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';

const Breadcrumbs = dynamic(() => import('@/components/Breadcrumbs'));
const PageHeader = dynamic(() => import('@/components/PageHeader'));
const SliceZone = dynamic(() => import('@prismicio/react').then((c) => c.SliceZone));

interface CustomPageProps {
    store: StoreModel;
    prefetch: any;
    page?: CustomPageDocument<string>;
    error?: string;
}
const CustomPage: FunctionComponent<CustomPageProps> = ({ store, prefetch, page }) => {
    const router = useRouter();
    const path = page?.url?.split('/').filter((i) => i);

    return (
        <Page className={`CustomPage CustomPage-${page?.type}`}>
            <NextSeo
                title={page?.data.meta_title || page?.data.title || ''}
                description={asText(page?.data.meta_description) || page?.data.description || ''}
                canonical={`https://${Config.domain}/${router.locale}${router.asPath}`}
                languageAlternates={
                    router?.locales?.map((locale) => ({
                        hrefLang: locale,
                        href: `https://${Config.domain}${
                            (locale !== 'x-default' && `/${locale}`) || ''
                        }${router.asPath}`
                    })) || undefined
                }
                additionalMetaTags={
                    (page?.data.keywords &&
                        ([
                            {
                                property: 'keywords',
                                content: page?.data.keywords
                            }
                        ] as any)) ||
                    undefined
                }
                openGraph={{
                    url: `https://${Config.domain}${router.asPath}`,
                    type: 'website',
                    title: page?.data.meta_title || '',
                    description: asText(page?.data.meta_description) || store?.description || '',
                    siteName: store.name,
                    locale: (router.locale !== 'x-default' && router.locale) || router.locales?.[1],
                    images:
                        (page?.data.meta_image && [
                            {
                                url: page?.data.meta_image!.url as string,
                                width: page?.data.meta_image!.dimensions?.width || 0,
                                height: page?.data.meta_image!.dimensions?.height || 0,
                                alt: page?.data.meta_image!.alt || '',
                                secureUrl: page?.data.meta_image!.url as string
                            }
                        ]) ||
                        undefined
                }}
            />

            <PageContent primary>
                {/* TODO: This should really be a slice anyways */}
                {(page?.uid !== 'homepage' && (
                    <PageHeader title={page?.data.title} subtitle={page?.data.description} />
                )) ||
                    null}

                <SliceZone
                    slices={page?.data.slices}
                    components={components}
                    context={{ prefetch, store }}
                />

                {/* TODO: Same here */}
                {(page?.uid !== 'homepage' && (
                    <Breadcrumbs
                        pages={path?.map((item, index) => {
                            return {
                                title: (index === path.length - 1 && page?.data.title) || item,
                                url: `/${item}`
                            };
                        })}
                        store={store}
                    />
                )) ||
                    null}
            </PageContent>
        </Page>
    );
};

export async function getStaticPaths({ locales }) {
    const pages = await PagesApi({});
    const paths = pages.paths.flatMap((path) => [
        ...locales.map((locale) => ({
            params: {
                uid: path !== '/' && path.split('/').filter((i) => i)
            },
            locale
        }))
    ]);

    return { paths: paths, fallback: 'blocking' };
}

export const getStaticProps: GetStaticProps<{}> = async ({ params, locale, previewData }) => {
    const client = createClient({ previewData });
    try {
        const uid = (params?.uid && params!.uid![params!.uid!.length - 1]) || 'homepage';

        let page: any = null;
        try {
            page = await client.getByUID('custom_page', uid, {
                lang: locale
            });
        } catch (error) {
            page = await client.getByUID('custom_page', uid);
        }
        const prefetch = (page && (await Prefetch(page, params, locale))) || null;

        return {
            props: {
                handle: uid,
                page,
                prefetch,
                analytics: (uid !== 'homepage' && {
                    pageType: AnalyticsPageType.page,
                    // TODO: fetch this ID from shopify
                    resourceId: `gid://shopify/OnlineStorePage/${uid}` || null
                }) || {
                    pageType: AnalyticsPageType.home
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
};

export default CustomPage;

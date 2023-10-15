import { AnalyticsPageType } from '@shopify/hydrogen-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Config } from '../../src/util/Config';
import { CustomPageDocument } from '../../prismicio-types';
import Error from 'next/error';
import { FunctionComponent } from 'react';
import { GetStaticProps } from 'next';
import { NextLocaleToLocale } from 'src/util/Locale';
import { NextSeo } from 'next-seo';
import Page from '@/components/Page';
import PageContent from '@/components/PageContent';
import { PagesApi } from '../../src/api/page';
import { Prefetch } from '../../src/util/Prefetch';
import { SSRConfig } from 'next-i18next';
import { SliceZone } from '@prismicio/react';
import type { StoreModel } from '../../src/models/StoreModel';
import { asText } from '@prismicio/client';
import { components } from '../../slices';
import { createClient } from '../../prismicio';
import dynamic from 'next/dynamic';
import { getServerTranslations } from 'src/util/getServerTranslations';
import { useRouter } from 'next/router';

const PageHeader = dynamic(() => import('@/components/PageHeader'));

interface CustomPageProps {
    store: StoreModel;
    prefetch: any;
    page?: CustomPageDocument<string>;
    error?: string;
}
const CustomPage: FunctionComponent<CustomPageProps> = ({ store, prefetch, page }) => {
    const router = useRouter();
    const path = page?.url?.split('/').filter((i) => i);

    if (!page) return <Error statusCode={404} />;

    return (
        <Page className={`CustomPage CustomPage-${page?.type}`}>
            <NextSeo
                title={page.data.meta_title || page.data.title || ''}
                description={
                    (page.data.meta_description && asText(page.data.meta_description)) || page.data.description || ''
                }
                canonical={`https://${Config.domain}/${router.locale}${router.asPath}`}
                languageAlternates={
                    router.locales?.map((locale) => ({
                        hrefLang: locale,
                        href: `https://${Config.domain}${(locale !== 'x-default' && `/${locale}`) || ''}${
                            router.asPath
                        }`
                    })) || undefined
                }
                additionalMetaTags={
                    (page.data.keywords &&
                        ([
                            {
                                property: 'keywords',
                                content: page.data.keywords
                            }
                        ] as any)) ||
                    undefined
                }
                openGraph={{
                    url: `https://${Config.domain}${router.asPath}`,
                    type: 'website',
                    title: page.data.meta_title || '',
                    description: asText(page.data.meta_description) || store?.description || '',
                    siteName: store?.name,
                    locale: (router.locale !== 'x-default' && router.locale) || router.locales?.[1],
                    images:
                        (page.data.meta_image && [
                            {
                                url: page.data.meta_image!.url as string,
                                width: page.data.meta_image!.dimensions?.width || 0,
                                height: page.data.meta_image!.dimensions?.height || 0,
                                alt: page.data.meta_image!.alt || '',
                                secureUrl: page.data.meta_image!.url as string
                            }
                        ]) ||
                        undefined
                }}
            />

            <PageContent primary>
                {/* TODO: This should really be a slice anyways */}
                {(page.uid !== 'homepage' && (page.data.enable_header === null || page.data.enable_header) && (
                    <PageHeader title={page.data.title} subtitle={page.data.description} />
                )) ||
                    null}

                <SliceZone slices={page.data.slices} components={components} context={{ prefetch, store }} />

                {/* TODO: Same here */}
                {(page.uid !== 'homepage' && (
                    <Breadcrumbs
                        pages={path?.map((item, index) => {
                            return {
                                title: (index === path.length - 1 && page.data.title) || item,
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
        ...(locales?.map((locale) => ({
            params: {
                uid: (path !== '/' && path.split('/').filter((i) => i)) || undefined
            },
            locale
        })) || [])
    ]);

    return { paths: paths, fallback: 'blocking' };
}

export const getStaticProps: GetStaticProps<{}> = async ({ params, locale: localeData, previewData }) => {
    const client = createClient({ previewData });
    const locale = NextLocaleToLocale(localeData);

    try {
        const uid = (params?.uid && params!.uid![params!.uid!.length - 1]) || 'homepage';

        if (['null', 'undefined', '[handle]'].includes(uid))
            return {
                notFound: true,
                revalidate: false
            };
        else if (localeData === 'x-default') {
            return {
                props: {} as any,
                revalidate: false
            };
        }

        let page: any = null;
        try {
            page = await client.getByUID('custom_page', uid, {
                lang: locale.locale
            });
        } catch (error) {
            page = await client.getByUID('custom_page', uid);
        }
        const prefetch = (page && (await Prefetch(page, params, locale.locale))) || null;

        let translations: SSRConfig | undefined = undefined;
        try {
            translations = await getServerTranslations(locale.language.toLowerCase(), ['common']);
        } catch (error) {
            console.warn(error);
        }

        return {
            props: {
                ...translations,
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
        console.warn(error);

        if (error.message?.includes('No documents')) {
            return {
                notFound: true
            };
        }

        console.error(error);
        return {
            props: {},
            revalidate: 1
        };
    }
};

export default CustomPage;

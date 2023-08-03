import { CollectionApi, CollectionsApi } from '../../../src/api/collection';
import type { GetStaticProps, InferGetStaticPropsType } from 'next';

import { AnalyticsPageType } from '@shopify/hydrogen-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import type { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import CollectionBlock from '@/components/CollectionBlock';
import type { CollectionPageDocument } from 'prismicio-types';
import { Config } from '../../../src/util/Config';
import Content from '@/components/Content';
import Error from 'next/error';
import type { FunctionComponent } from 'react';
import { NextLocaleToLocale } from 'src/util/Locale';
import { NextSeo } from 'next-seo';
import Page from '@/components/Page';
import PageContent from '@/components/PageContent';
import PageHeader from '@/components/PageHeader';
import { Prefetch } from 'src/util/Prefetch';
import React from 'react';
import { RedirectCollectionApi } from 'src/api/redirects';
import { SSRConfig } from 'next-i18next';
import type { ShopifyPageViewPayload } from '@shopify/hydrogen-react';
import { SliceZone } from '@prismicio/react';
import type { StoreModel } from '../../../src/models/StoreModel';
import Vendors from '@/components/Vendors';
import { VendorsApi } from '../../../src/api/vendor';
import { asText } from '@prismicio/client';
import { captureException } from '@sentry/nextjs';
import { components } from '../../../slices';
import { convertSchemaToHtml } from '@thebeyondgroup/shopify-rich-text-renderer';
import { createClient } from 'prismicio';
import { getServerTranslations } from 'src/util/getServerTranslations';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import useSWR from 'swr';

const Body = styled(Content)`
    overflow: hidden;
`;

const ShortDescription = styled(Content)`
    overflow: hidden;
`;

//InferGetStaticPropsType<typeof getStaticProps>
const CollectionPage: FunctionComponent<InferGetStaticPropsType<typeof getStaticProps>> = ({
    store,
    collection: collectionData,
    page,
    vendors,
    prefetch
}) => {
    const router = useRouter();

    const { data: collection } = useSWR(
        [
            'CollectionApi',
            {
                handle: collectionData?.handle!,
                locale: router.locale
            }
        ],
        ([, props]) => CollectionApi(props),
        {
            fallbackData: collectionData as Collection
        }
    );

    if (!collection && !page) return <Error statusCode={404} />;

    const subtitle =
        ((collection as any)?.shortDescription?.value && (
            <ShortDescription
                dangerouslySetInnerHTML={{
                    __html:
                        (
                            convertSchemaToHtml(
                                (collection as any).shortDescription.value,
                                false
                            ) as string
                        )?.replaceAll(`="null"`, '') || ''
                }}
            />
        )) ||
        null;

    return (
        <Page className="CollectionPage">
            <NextSeo
                title={page?.data?.meta_title || collection?.seo?.title || collection?.title}
                description={
                    (page?.data?.meta_description && asText(page?.data?.meta_description)) ||
                    collection?.seo?.description ||
                    collection?.description ||
                    undefined
                }
                canonical={`https://${Config.domain}/${router.locale}/collections/${collection.handle}/`}
                languageAlternates={
                    router.locales?.map((locale) => ({
                        hrefLang: locale,
                        href: `https://${Config.domain}/${
                            (locale !== 'x-default' && `${locale}/`) || ''
                        }collections/${collection.handle}/`
                    })) || []
                }
                additionalMetaTags={
                    ((collection as any).keywords?.value && [
                        {
                            property: 'keywords',
                            content: (collection as any).keywords?.value
                        }
                    ]) ||
                    []
                }
                openGraph={{
                    url: `https://${Config.domain}/collections/${collection.handle}/`,
                    type: 'website',
                    title: page?.data?.meta_title || collection.seo?.title || collection.title,
                    description:
                        (page?.data?.meta_description && asText(page?.data?.meta_description)) ||
                        collection?.seo?.description ||
                        collection?.description ||
                        '',
                    siteName: store!.name,
                    locale: (router.locale !== 'x-default' && router.locale) || router.locales?.[1],
                    images:
                        (collection.image && [
                            {
                                url: collection.image!.url as string,
                                width: collection.image!.width as number,
                                height: collection.image!.height as number,
                                alt: collection.image!.altText || '',
                                secureUrl: collection.image!.url as string
                            }
                        ]) ||
                        undefined
                }}
            />

            <PageContent
                primary
                style={
                    (page?.data &&
                        ({
                            '--accent-primary': page.data.accent_primary,
                            '--accent-primary-light':
                                'color-mix(in srgb, var(--accent-primary) 65%, var(--color-bright))',
                            '--accent-primary-dark':
                                'color-mix(in srgb, var(--accent-primary) 65%, var(--color-dark))',
                            '--accent-primary-text':
                                (page.data.accent_primary_dark && 'var(--color-bright)') ||
                                'var(--color-dark)',

                            '--accent-secondary': page.data.accent_secondary,
                            '--accent-secondary-light':
                                'color-mix(in srgb, var(--accent-secondary) 35%, var(--color-bright))',
                            '--accent-secondary-dark':
                                'color-mix(in srgb, var(--accent-secondary) 65%, var(--color-dark))',
                            '--accent-secondary-text':
                                (page.data.accent_secondary_dark && 'var(--color-bright)') ||
                                'var(--color-dark)'
                        } as React.CSSProperties)) ||
                    undefined
                }
            >
                {((!page?.data || page.data.enable_header) && (
                    <PageHeader title={collection.title} subtitle={subtitle} />
                )) ||
                    null}

                {((!page?.data || page.data.enable_collection) && (
                    <CollectionBlock
                        handle={`${router.query.handle}`}
                        data={collection}
                        noLink
                        hideTitle
                        store={store!}
                    />
                )) ||
                    null}

                <SliceZone
                    slices={page?.data.slices}
                    components={components}
                    context={{ store, prefetch }}
                />

                {((!page?.data || page.data.enable_body) && (
                    <>
                        <Body
                            dangerouslySetInnerHTML={{
                                __html: collection?.descriptionHtml || ''
                            }}
                        />
                        <Vendors data={vendors} />
                    </>
                )) ||
                    null}

                <Breadcrumbs
                    pages={[
                        {
                            title: 'Collections',
                            url: `/collections/`
                        },
                        {
                            title: collection?.title || router.query.handle,
                            url: `/collections/${router.query.handle}`
                        }
                    ]}
                    store={store}
                />
            </PageContent>
        </Page>
    );
};

export async function getStaticPaths({ locales }) {
    const collections = await CollectionsApi();

    let paths = [
        ...collections
            ?.map((collection) => [
                {
                    params: { handle: collection?.handle }
                },
                ...(locales?.map((locale) => ({
                    params: { handle: collection?.handle },
                    locale: locale
                })) || [])
            ])
            .flat()
            .filter((a) => a?.params?.handle)
    ];

    return { paths, fallback: 'blocking' };
}

export const getStaticProps: GetStaticProps<{
    collection?: Collection | null;
    page?: CollectionPageDocument<string> | null;
    prefetch?: any | null;
    vendors?: any | null;
    store?: StoreModel;
    analytics?: Partial<ShopifyPageViewPayload>;
}> = async ({ params, locale: localeData, previewData }) => {
    const locale = NextLocaleToLocale(localeData);

    let handle = '';
    if (Array.isArray(params?.handle)) {
        handle = params?.handle?.join('') || '';
    } else {
        handle = params?.handle || '';
    }

    if (!handle || ['null', 'undefined', '[handle]'].includes(handle))
        return {
            notFound: true,
            revalidate: false
        };
    else if (localeData === 'x-default') {
        return {
            props: {},
            revalidate: false
        };
    }

    const redirect = await RedirectCollectionApi({ handle, locale: locale.locale });
    if (redirect) {
        return {
            redirect: {
                permanent: false,
                destination: redirect
            },
            revalidate: false
        };
    }

    const client = createClient({ previewData });

    let page: CollectionPageDocument<string> | null = null;
    let collection: Collection | null = null;
    let vendors: any = null;

    try {
        collection = await CollectionApi({ handle, locale: locale.locale, limit: 16 });
    } catch (error) {
        if (error?.message?.includes('404')) {
            return {
                notFound: true
            };
        }

        captureException(error);
        throw error;
    }

    try {
        page = await client.getByUID('collection_page', handle, {
            lang: locale.locale
        });
    } catch {
        try {
            page = await client.getByUID('collection_page', handle);
        } catch {}
    }
    const prefetch =
        (page &&
            (await Prefetch(page!, params, locale.locale, {
                collections: {
                    [handle]: collection
                }
            }))) ||
        null;

    let translations: SSRConfig | undefined = undefined;
    try {
        translations = await getServerTranslations(locale.language.toLowerCase(), ['common']);
    } catch (error) {
        console.warn(error);
    }

    try {
        vendors = await VendorsApi({ locale: locale.locale });
    } catch (error) {
        captureException(error);
    }

    return {
        props: {
            ...translations,
            collection,
            page,
            vendors: vendors ?? null,

            prefetch,

            analytics: {
                pageType: AnalyticsPageType.collection,
                resourceId: collection?.id || '',
                collectionHandle: collection?.handle || ''
            }
        },
        revalidate: 60
    };
};

export default CollectionPage;

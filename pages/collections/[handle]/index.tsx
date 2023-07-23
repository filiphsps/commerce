import * as Sentry from '@sentry/nextjs';

import { AnalyticsPageType, ShopifyPageViewPayload } from '@shopify/hydrogen-react';
import { CollectionApi, CollectionsApi } from '../../../src/api/collection';
import type { GetStaticProps, InferGetStaticPropsType } from 'next';
import React, { FunctionComponent } from 'react';

import Breadcrumbs from '@/components/Breadcrumbs';
import { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import CollectionBlock from '@/components/CollectionBlock';
import { CollectionPageDocument } from 'prismicio-types';
import { Config } from '../../../src/util/Config';
import Content from '@/components/Content';
import Error from 'next/error';
import { NextSeo } from 'next-seo';
import Page from '@/components/Page';
import PageContent from '@/components/PageContent';
import PageHeader from '@/components/PageHeader';
import { RedirectCollectionApi } from 'src/api/redirects';
import { SliceZone } from '@prismicio/react';
import { StoreModel } from '../../../src/models/StoreModel';
import Vendors from '@/components/Vendors';
import { VendorsApi } from '../../../src/api/vendor';
import { asText } from '@prismicio/client';
import { components } from '../../../slices';
import { convertSchemaToHtml } from '@thebeyondgroup/shopify-rich-text-renderer';
import { createClient } from 'prismicio';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import useSWR from 'swr';

const Body = styled(Content)`
    overflow: hidden;
`;

const ShortDescription = styled(Content)`
    overflow: hidden;
    max-width: 64rem;
`;

//InferGetStaticPropsType<typeof getStaticProps>
const CollectionPage: FunctionComponent<InferGetStaticPropsType<typeof getStaticProps>> = ({
    store,
    collection: collectionData,
    page,
    vendors
}) => {
    const router = useRouter();

    const { data: collection } = useSWR(
        {
            handle: collectionData?.handle!,
            locale: router.locale
        },
        CollectionApi,
        {
            fallbackData: collectionData as Collection
        }
    );

    if (!collection) return <Error statusCode={404} />;
    let accents: string[] = [];
    if ((collection as any).accents?.value)
        accents = JSON.parse((collection as any).accents?.value);

    const subtitle =
        ((collection as any).shortDescription?.value && (
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
                title={collection?.seo?.title || collection?.title}
                description={collection?.seo?.description || collection?.description || undefined}
                canonical={`https://${Config.domain}/${router.locale}/collections/${collection.handle}/`}
                languageAlternates={
                    router?.locales?.map((locale) => ({
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
                    title: page?.data.meta_title || collection.seo?.title || collection.title,
                    description:
                        (page?.data.meta_description && asText(page?.data.meta_description)) ||
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
                    (accents?.length &&
                        ({
                            //'--background': accents?.[0] || 'var(--color-block)',
                            '--foreground': accents?.[0] || 'var(--color-block)'
                        } as React.CSSProperties)) ||
                    {}
                }
            >
                <PageHeader title={collection.title} subtitle={subtitle} />

                <CollectionBlock
                    handle={`${router.query.handle}`}
                    data={collection}
                    noLink
                    hideTitle
                    store={store!}
                />

                <SliceZone slices={page?.data.slices} components={components} context={{ store }} />

                <Body
                    dangerouslySetInnerHTML={{
                        __html: collection?.descriptionHtml || ''
                    }}
                />

                {(!page && <Vendors data={vendors} />) || null}

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
                ...locales.map((locale) => ({
                    params: { handle: collection?.handle },
                    locale: locale
                }))
            ])
            .flat()
            .filter((a) => a?.params?.handle)
    ];

    return { paths, fallback: 'blocking' };
}

export const getStaticProps: GetStaticProps<{
    collection?: Collection | null;
    page?: CollectionPageDocument<string> | null;
    vendors?: any | null;
    store?: StoreModel;
    analytics?: Partial<ShopifyPageViewPayload>;
}> = async ({ params, locale, previewData }) => {
    let handle = '';
    if (Array.isArray(params?.handle)) {
        handle = params?.handle?.join('') || '';
    } else {
        handle = params?.handle || '';
    }

    const redirect = await RedirectCollectionApi({ handle, locale });
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

    if (!handle || ['null', 'undefined', '[handle]'].includes(handle))
        return {
            notFound: true,
            revalidate: false
        };
    else if (locale === 'x-default') {
        return {
            props: {},
            revalidate: false
        };
    }

    let collection: Collection | null = null;
    let page: CollectionPageDocument<string> | null = null;
    let vendors: any = null;

    try {
        collection = await CollectionApi({ handle, locale });
    } catch (error) {
        Sentry.captureException(error);
    }

    try {
        page = await client.getByUID('collection_page', handle, {
            lang: locale
        });
    } catch {
        try {
            page = await client.getByUID('collection_page', handle);
        } catch {}
    }

    try {
        vendors = await VendorsApi();
    } catch (error) {
        Sentry.captureException(error);
    }

    return {
        props: {
            collection: collection,
            page,
            vendors: vendors ?? null,
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

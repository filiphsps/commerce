import * as Sentry from '@sentry/nextjs';

import { CollectionApi, CollectionsApi } from '../../../src/api/collection';
import React, { FunctionComponent } from 'react';

import { AnalyticsPageType } from '@shopify/hydrogen-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import CollectionBlock from '@/components/CollectionBlock';
import { Config } from '../../../src/util/Config';
import Content from '@/components/Content';
import Error from 'next/error';
import { NextSeo } from 'next-seo';
import Page from '@/components/Page';
import PageContent from '@/components/PageContent';
import PageHeader from '@/components/PageHeader';
import { StoreModel } from '../../../src/models/StoreModel';
import Vendors from '@/components/Vendors';
import { VendorsApi } from '../../../src/api/vendor';
import { convertSchemaToHtml } from '@thebeyondgroup/shopify-rich-text-renderer';
import styled from 'styled-components';
import { useRouter } from 'next/router';

const Body = styled(Content)`
    overflow: hidden;
`;

const ShortDescription = styled(Content)`
    overflow: hidden;
    max-width: 64rem;
`;

interface CollectionPageProps {
    store: StoreModel;
    collection: Collection;
}
const CollectionPage: FunctionComponent<CollectionPageProps> = ({ store, collection }) => {
    const router = useRouter();

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
                    store={store}
                />

                <Body
                    dangerouslySetInnerHTML={{
                        __html: collection?.descriptionHtml || ''
                    }}
                />

                <Vendors />

                <Breadcrumbs
                    pages={[
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

export async function getStaticProps({ params, locale }) {
    let handle = '';
    if (Array.isArray(params.handle)) {
        handle = params?.handle?.join('');
    } else {
        handle = params?.handle;
    }

    if (handle === 'undefined' || !handle)
        return {
            notFound: true,
            revalidate: false
        };

    if (locale === 'x-default') {
        return {
            props: {},
            revalidate: false
        };
    }

    let collection: Collection | null = null;
    let vendors;

    try {
        collection = await CollectionApi({ handle, locale });
    } catch (error) {
        Sentry.captureException(error);
    }

    try {
        vendors = await VendorsApi();
    } catch (error) {
        Sentry.captureException(error);
    }

    return {
        props: {
            collection: collection,
            vendors: vendors ?? null,
            analytics: {
                pageType: AnalyticsPageType.collection,
                resourceId: collection?.id || null,
                collectionHandle: collection?.handle || null
            }
        },
        revalidate: 10
    };
}

export default CollectionPage;

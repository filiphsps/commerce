import * as Sentry from '@sentry/nextjs';

import { CollectionApi, CollectionsApi } from '../../../src/api/collection';
import React, { FunctionComponent } from 'react';

import { AnalyticsPageType } from '@shopify/hydrogen-react';
import Breadcrumbs from '../../../src/components/Breadcrumbs';
import { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import CollectionBlock from '../../../src/components/CollectionBlock';
import Color from 'color';
import { Config } from '../../../src/util/Config';
import Content from '../../../src/components/Content';
import Error from 'next/error';
import Image from 'next/image';
import { ImageLoader } from '../../../src/util/ImageLoader';
import { NextSeo } from 'next-seo';
import Page from '../../../src/components/Page';
import PageContent from '../../../src/components/PageContent';
import PageHeader from '../../../src/components/PageHeader';
import { StoreModel } from '../../../src/models/StoreModel';
import Vendors from '../../../src/components/Vendors';
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

const FancyBrandContent = styled(PageHeader)``;
const FancyBrandHeader = styled.section`
    position: relative;
    display: grid;
    grid-template-columns: 1fr;
    flex-grow: 1;
    gap: var(--block-spacer);
    padding: var(--block-padding-large);
    background: var(--background);
    background: linear-gradient(320deg, var(--background) 0%, var(--background-dark) 100%);
    border-radius: var(--block-border-radius);
    color: var(--foreground);

    @media (min-width: 950px) {
        grid-template-columns: 1fr auto;
    }

    > ${FancyBrandContent} {
        padding: 0px;
        background: none;
    }
`;
const FancyBrandLogo = styled.div`
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: var(--block-border-radius);
    max-height: 100%;
    aspect-ratio: 1 / 1;
    height: 100%;
    width: auto;
    box-shadow: 0px 0px 1rem 0px var(--color-block-shadow);

    @media (max-width: 950px) {
        display: none;
    }
`;
const LogoWrapper = styled.div`
    position: relative;
    height: 100%;
    width: 100%;

    img {
        object-fit: cover;
        object-position: center;
    }
`;

interface CollectionPageProps {
    store: StoreModel;
    collection: Collection;
}
const CollectionPage: FunctionComponent<CollectionPageProps> = ({ store, collection }) => {
    const router = useRouter();

    if (!collection) return <Error statusCode={404} />;
    const isBrand = !!((collection as any).isBrand?.value === 'true');
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
                    router?.locales
                        ?.filter((locale) => locale !== 'x-default')
                        .map((locale) => ({
                            hrefLang: locale,
                            href: `https://${Config.domain}/${locale}/collections/${collection.handle}/`
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

            <PageContent primary>
                {(isBrand && accents.length >= 2 && (
                    <FancyBrandHeader
                        style={
                            {
                                '--background': accents?.[0] || 'var(--color-block)',
                                '--background-dark': accents?.[1] || 'var(--color-block)',
                                '--foreground':
                                    (accents?.[0] &&
                                        Color(accents[0]).isDark() &&
                                        'var(--color-bright)') ||
                                    'var(--color-dark)'
                            } as React.CSSProperties
                        }
                    >
                        <FancyBrandContent title={collection.title} subtitle={subtitle} />
                        {collection.image && (
                            <FancyBrandLogo>
                                <LogoWrapper>
                                    <Image
                                        src={collection.image.url}
                                        alt={collection.image.altText || ''}
                                        title={collection.image.altText || undefined}
                                        //width={collection.image.width || 0}
                                        //height={collection.image.height || 0}
                                        fill
                                        loader={ImageLoader}
                                    />
                                </LogoWrapper>
                            </FancyBrandLogo>
                        )}
                    </FancyBrandHeader>
                )) || <PageHeader title={collection.title} subtitle={subtitle} />}

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
            .filter((a) => a?.params?.handle && a.locale !== 'x-default')
    ];

    return { paths, fallback: true };
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

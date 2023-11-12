import { CollectionApi } from '@/api/shopify/collection';
import { NextLocaleToLocale } from '@/utils/locale';

import { PageApi } from '@/api/page';
import { StorefrontApiClient } from '@/api/shopify';
import { StoreApi } from '@/api/store';
import CollectionBlock from '@/components/CollectionBlock';
import Content from '@/components/Content';
import Page from '@/components/Page';
import PageContent from '@/components/PageContent';
import PrismicPage from '@/components/prismic-page';
import Heading from '@/components/typography/heading';
import { getDictionary } from '@/i18n/dictionary';
import { BuildConfig } from '@/utils/build-config';
import { isValidHandle } from '@/utils/handle';
import { Prefetch } from '@/utils/prefetch';
import { asText } from '@prismicio/client';
import { convertSchemaToHtml } from '@thebeyondgroup/shopify-rich-text-renderer';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { metadata as notFoundMetadata } from '../../not-found';

export type CollectionPageParams = { locale: string; handle: string };
export async function generateMetadata({ params }: { params: CollectionPageParams }): Promise<Metadata> {
    const { locale: localeData, handle } = params;
    if (!isValidHandle(handle)) return notFoundMetadata;

    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFoundMetadata;

    try {
        const api = StorefrontApiClient({ locale });
        const store = await StoreApi({ locale, api });
        const collection = await CollectionApi({ api, handle });
        const { page } = await PageApi({ locale, handle, type: 'collection_page' });
        const locales = store.i18n.locales;

        const description: string | undefined =
            (page?.meta_description && asText(page.meta_description)) ||
            collection.seo.description ||
            collection.description?.substring(0, 150) ||
            undefined;
        return {
            title: page?.meta_title || collection.title,
            description,
            alternates: {
                canonical: `https://${BuildConfig.domain}/${locale.locale}/collections/${handle}/`,
                languages: locales.reduce(
                    (prev, { locale }) => ({
                        ...prev,
                        [locale]: `https://${BuildConfig.domain}/${locale}/collections/${handle}/`
                    }),
                    {}
                )
            },
            openGraph: {
                url: `/${locale.locale}/collections/${handle}/`,
                type: 'website',
                title: page?.meta_title || collection.title,
                description,
                siteName: store?.name,
                locale: locale.locale,
                images:
                    (page?.meta_image && [
                        {
                            url: page?.meta_image!.url as string,
                            width: page?.meta_image!.dimensions?.width || 0,
                            height: page?.meta_image!.dimensions?.height || 0,
                            alt: page?.meta_image!.alt || '',
                            secureUrl: page?.meta_image!.url as string
                        }
                    ]) ||
                    undefined
            }
        };
    } catch (error: any) {
        const message = (error.message as string) || '';
        if (message.startsWith('404:')) {
            return notFoundMetadata;
        }

        throw error;
    }
}

export default async function CollectionPage({ params }: { params: CollectionPageParams }) {
    const { locale: localeData, handle } = params;
    if (!isValidHandle(handle)) return notFound();

    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFound();

    try {
        const i18n = await getDictionary(locale);
        const api = StorefrontApiClient({ locale });
        const store = await StoreApi({ locale, api });
        const collection = await CollectionApi({ api, handle });

        const { page } = await PageApi({ locale, handle, type: 'collection_page' });
        const prefetch = await Prefetch({
            client: api,
            page,
            initialData: {
                collections: {
                    [collection.handle]: collection
                }
            }
        });

        const subtitle =
            ((collection as any)?.shortDescription?.value && (
                <Content
                    dangerouslySetInnerHTML={{
                        __html:
                            (
                                convertSchemaToHtml((collection as any).shortDescription.value, false) as string
                            )?.replaceAll(`="null"`, '') || ''
                    }}
                />
            )) ||
            null;

        return (
            <Page>
                <PageContent primary>
                    {(!page || page.enable_header) && (
                        <div>
                            <Heading title={collection.title} subtitle={subtitle} />
                        </div>
                    )}
                    {(!page || page.enable_collection === undefined || page.enable_collection) && (
                        <>
                            <CollectionBlock data={collection} store={store} locale={locale} i18n={i18n} />
                        </>
                    )}

                    {page?.slices && page?.slices.length > 0 && (
                        <PrismicPage
                            store={store}
                            locale={locale}
                            page={page}
                            prefetch={prefetch}
                            i18n={i18n}
                            handle={handle}
                            type={'collection_page'}
                        />
                    )}
                </PageContent>
            </Page>
        );
    } catch (error: any) {
        const message = (error.message as string) || '';
        if (message.startsWith('404:')) {
            return notFoundMetadata;
        }

        throw error;
    }
}

export const revalidate = 120;

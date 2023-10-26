import { CollectionApi, CollectionsApi } from '@/api/shopify/collection';
import { DefaultLocale, NextLocaleToLocale } from '@/utils/locale';

import { BuildConfig } from '@/utils/build-config';
import Content from '@/components/Content';
import Page from '@/components/Page';
import { PageApi } from '@/api/page';
import PageContent from '@/components/PageContent';
import PageHeader from '@/components/PageHeader';
import { Prefetch } from '@/utils/Prefetch';
import PrismicPage from '@/components/prismic-page';
import { StoreApi } from '@/api/store';
import { StorefrontApiClient } from '@/api/shopify';
import { Suspense } from 'react';
import { asText } from '@prismicio/client';
import { convertSchemaToHtml } from '@thebeyondgroup/shopify-rich-text-renderer';
import { getDictionary } from '@/i18n/dictionarie';
import { isValidHandle } from '@/utils/handle';
import { notFound } from 'next/navigation';

export type CollectionPageParams = { locale: string; handle: string };

export async function generateStaticParams() {
    // FIXME: Pagination.
    const collections = await CollectionsApi({ client: StorefrontApiClient({ locale: DefaultLocale() }) });

    return collections
        .map(({ handle }) => BuildConfig.i18n.locales.map((locale) => ({ locale: locale, handle })))
        .flat();
}

export async function generateMetadata({ params }: { params: CollectionPageParams }) {
    const { locale: localeData, handle } = params;
    const locale = NextLocaleToLocale(localeData);

    const client = StorefrontApiClient({ locale });
    const collection = await CollectionApi({ client, handle });
    const { page } = await PageApi({ locale, handle, type: 'collection_page' });

    return {
        title: `${collection.title}`,
        description:
            (page?.meta_description && asText(page?.meta_description)) ||
            collection?.seo?.description ||
            collection?.description ||
            undefined
    };
}

export default async function CollectionPage({ params }: { params: CollectionPageParams }) {
    const { locale: localeData, handle } = params;
    const locale = NextLocaleToLocale(localeData);
    const i18n = await getDictionary(locale);

    if (!isValidHandle(handle)) return notFound();

    const client = StorefrontApiClient({ locale });
    const store = await StoreApi({ locale, shopify: client });
    const collection = await CollectionApi({ client, handle });

    const { page } = await PageApi({ locale, handle, type: 'collection_page' });
    const prefetch = (page && (await Prefetch({ client, page }))) || null;

    const subtitle =
        ((collection as any)?.shortDescription?.value && (
            <Content
                dangerouslySetInnerHTML={{
                    __html:
                        (convertSchemaToHtml((collection as any).shortDescription.value, false) as string)?.replaceAll(
                            `="null"`,
                            ''
                        ) || ''
                }}
            />
        )) ||
        null;

    // FIXME: Legacy: `enable_header`, `enable_collection` etc.
    return (
        <Page>
            <PageContent primary>
                {(!page || page.enable_header) && <PageHeader title={collection.title} subtitle={subtitle} />}
                <Suspense>
                    {page && (
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
                </Suspense>
            </PageContent>
        </Page>
    );
}

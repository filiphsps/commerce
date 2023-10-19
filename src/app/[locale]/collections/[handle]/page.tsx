import { CollectionApi, CollectionsApi } from '@/api/collection';

import { Config } from '@/utils/Config';
import { NextLocaleToLocale } from '@/utils/Locale';
import Page from '@/components/Page';
import { PageApi } from '@/api/page';
import PageContent from '@/components/PageContent';
import PageHeader from '@/components/PageHeader';
import { Prefetch } from '@/utils/Prefetch';
import { SliceZone } from '@prismicio/react';
import { StoreApi } from '@/api/store';
import { asText } from '@prismicio/client';
import { isValidHandle } from '@/utils/handle';
import { notFound } from 'next/navigation';
import { components as slices } from '@/slices';

export type CollectionPageParams = { locale: string; handle: string };

export async function generateStaticParams() {
    // FIXME: Pagination.
    const collections = await CollectionsApi();

    return collections.map(({ handle }) => Config.i18n.locales.map((locale) => ({ locale: locale, handle }))).flat();
}

export async function generateMetadata({ params }: { params: CollectionPageParams }) {
    const { locale: localeData, handle } = params;
    const locale = NextLocaleToLocale(localeData);

    const collection = await CollectionApi({ handle, locale: locale.locale });
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

export default async function CollectiomPage({ params }: { params: CollectionPageParams }) {
    const { locale: localeData, handle } = params;
    const locale = NextLocaleToLocale(localeData);

    if (!isValidHandle(handle)) return notFound();

    const store = await StoreApi({ locale: locale.locale });
    const collection = await CollectionApi({ handle, locale: locale.locale });
    const { page } = await PageApi({ locale, handle, type: 'collection_page' });
    const prefetch = (page && (await Prefetch(page, locale.locale))) || null;

    // FIXME: Legacy: `enable_header`, `enable_collection` etc.
    return (
        <Page>
            {page.enable_header && <PageHeader title={collection.title} subtitle={null} />}

            <PageContent primary>
                <SliceZone slices={page.slices} components={slices} context={{ store, prefetch }} />
            </PageContent>
        </Page>
    );
}

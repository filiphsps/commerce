import { CollectionApi, CollectionsApi } from '@/api/collection';

import { PageApi } from '@/api/page';
import { StoreApi } from '@/api/store';
import Content from '@/components/Content';
import Page from '@/components/Page';
import PageContent from '@/components/PageContent';
import PageHeader from '@/components/PageHeader';
import { getDictionary } from '@/i18n/dictionarie';
import { components as slices } from '@/slices';
import { Prefetch } from '@/utils/Prefetch';
import { Config } from '@/utils/config';
import { isValidHandle } from '@/utils/handle';
import { NextLocaleToLocale } from '@/utils/locale';
import { asText } from '@prismicio/client';
import { SliceZone } from '@prismicio/react';
import { convertSchemaToHtml } from '@thebeyondgroup/shopify-rich-text-renderer';
import { notFound } from 'next/navigation';

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

export default async function CollectionPage({ params }: { params: CollectionPageParams }) {
    const { locale: localeData, handle } = params;
    const locale = NextLocaleToLocale(localeData);
    const i18n = await getDictionary(locale);

    if (!isValidHandle(handle)) return notFound();

    const store = await StoreApi({ locale });
    const collection = await CollectionApi({ handle, locale: locale.locale });

    const { page } = await PageApi({ locale, handle, type: 'collection_page' });
    const prefetch = (page && (await Prefetch(page, locale.locale))) || null;

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
                {page && <SliceZone slices={page.slices} components={slices} context={{ store, prefetch, i18n }} />}
            </PageContent>
        </Page>
    );
}

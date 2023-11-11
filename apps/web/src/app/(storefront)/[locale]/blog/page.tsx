import { PageApi } from '@/api/page';
import { StorefrontApiClient } from '@/api/shopify';
import { StoreApi } from '@/api/store';
import Page from '@/components/Page';
import PageContent from '@/components/PageContent';
import PrismicPage from '@/components/prismic-page';
import Heading from '@/components/typography/heading';
import { BuildConfig } from '@/utils/build-config';
import { NextLocaleToLocale } from '@/utils/locale';
import { Prefetch } from '@/utils/prefetch';
import { asText } from '@prismicio/client';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDictionary } from 'src/app/(storefront)/[locale]/dictionary';
import { metadata as notFoundMetadata } from '../not-found';

export type BlogPageParams = { locale: string };
export async function generateMetadata({ params }: { params: BlogPageParams }): Promise<Metadata | null> {
    const { locale: localeData } = params;
    const handle = 'blog';
    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFoundMetadata;

    const store = await StoreApi({ locale, api: StorefrontApiClient({ locale }) });
    const { page } = await PageApi({ locale, handle, type: 'custom_page' });
    const locales = store.i18n.locales;

    const description: string | undefined =
        (page?.meta_description && asText(page.meta_description)) || page?.description || undefined;
    return {
        title: page?.meta_title || page?.title || 'Blog', // TODO: Fallback should respect i18n.
        description,
        alternates: {
            canonical: `https://${BuildConfig.domain}/${locale.locale}/blog/`,
            languages: locales.reduce(
                (prev, { locale }) => ({
                    ...prev,
                    [locale]: `https://${BuildConfig.domain}/${locale}/blog/`
                }),
                {}
            )
        },
        openGraph: {
            url: `/${locale.locale}/blog/`,
            type: 'website',
            title: page?.meta_title || page?.title!,
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
}

export default async function SearchPage({ params }: { params: BlogPageParams }) {
    const locale = NextLocaleToLocale(params.locale);
    if (!locale) return notFound();
    const i18n = await getDictionary(locale);
    const handle = 'blog';

    const client = StorefrontApiClient({ locale });
    const store = await StoreApi({ locale, api: client });
    const { page } = await PageApi({ locale, handle, type: 'custom_page' });
    const prefetch = (page && (await Prefetch({ client, page }))) || null;

    return (
        <Page>
            <PageContent primary>
                <Heading title={page?.title} subtitle={page?.description} />

                {page?.slices && page?.slices.length > 0 && (
                    <PrismicPage
                        store={store}
                        locale={locale}
                        page={page}
                        prefetch={prefetch}
                        i18n={i18n}
                        handle={handle}
                        type={'custom_page'}
                    />
                )}
            </PageContent>
        </Page>
    );
}

export const revalidate = 120;

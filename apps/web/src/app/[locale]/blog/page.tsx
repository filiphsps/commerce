import { BuildConfig } from '@/utils/build-config';
import Heading from '@/components/typography/heading';
import type { Metadata } from 'next';
import { NextLocaleToLocale } from '@/utils/locale';
import Page from '@/components/Page';
import { PageApi } from '@/api/page';
import PageContent from '@/components/PageContent';
import { Prefetch } from '@/utils/prefetch';
import PrismicPage from '@/components/prismic-page';
import { StoreApi } from '@/api/store';
import { StorefrontApiClient } from '@/api/shopify';
import { Suspense } from 'react';
import { asText } from '@prismicio/client';
import { getDictionary } from '@/i18n/dictionarie';

export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
    const { locale: localeData } = params;
    const handle = 'blog';
    const locale = NextLocaleToLocale(localeData);
    const locales = BuildConfig.i18n.locales;

    const store = await StoreApi({ locale, shopify: StorefrontApiClient({ locale }) });
    const { page } = await PageApi({ locale, handle, type: 'custom_page' });

    return {
        title: page?.meta_title || page?.title || 'Blog', // TODO: Fallback should respect i18n.
        description: (page?.meta_description && asText(page?.meta_description)) || page?.description! || '',
        alternates: {
            canonical: `https://${BuildConfig.domain}/blog/`,
            languages: locales.reduce(
                (prev, locale) => ({
                    ...prev,
                    [locale]: `https://${BuildConfig.domain}/${locale}/blog/`
                }),
                {}
            )
        },
        openGraph: {
            url: `https://${BuildConfig.domain}${locale.locale}/blog/`,
            type: 'website',
            title: page?.meta_title || page?.title!,
            description: (page?.meta_description && asText(page.meta_description)) || page?.description || '',
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

export async function generateStaticParams() {
    // TODO: Use list of locales to pre-generate pages for as it's expensive to do during the build.
    return BuildConfig.i18n.locales.map((locale) => ({ locale }));
}

export type BlogPageParams = { locale: string };
export default async function SearchPage({ params }: { params: BlogPageParams }) {
    const locale = NextLocaleToLocale(params.locale);
    const i18n = await getDictionary(locale);
    const handle = 'blog';

    const client = StorefrontApiClient({ locale });
    const store = await StoreApi({ locale, shopify: client });
    const { page } = await PageApi({ locale, handle, type: 'custom_page' });
    const prefetch = (page && (await Prefetch({ client, page }))) || null;

    return (
        <Page>
            <PageContent primary>
                <Heading title={page?.title} subtitle={page?.description} />

                <Suspense>
                    {page && (
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
                </Suspense>
            </PageContent>
        </Page>
    );
}

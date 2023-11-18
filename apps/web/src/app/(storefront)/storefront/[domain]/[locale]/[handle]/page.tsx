import { PageApi } from '@/api/page';
import { StorefrontApiClient } from '@/api/shopify';
import { StoreApi } from '@/api/store';
import Page from '@/components/Page';
import PageContent from '@/components/PageContent';
import PrismicPage from '@/components/prismic-page';
import { getDictionary } from '@/i18n/dictionary';
import { isValidHandle } from '@/utils/handle';
import { NextLocaleToLocale } from '@/utils/locale';
import { Prefetch } from '@/utils/prefetch';
import { asText } from '@prismicio/client';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { metadata as notFoundMetadata } from '../not-found';

export type CustomPageParams = { domain: string; locale: string; handle: string };

/* c8 ignore start */
export async function generateMetadata({
    params: { domain, locale: localeData, handle }
}: {
    params: CustomPageParams;
}): Promise<Metadata> {
    if (!isValidHandle(handle)) return notFoundMetadata;

    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFoundMetadata;

    try {
        const store = await StoreApi({ locale, api: StorefrontApiClient({ domain, locale }) });
        const locales = store.i18n.locales;

        const { page } = await PageApi({ locale, handle, type: 'custom_page' });
        if (!page) return notFoundMetadata;

        // If the page is the homepage we shouldn't add the handle to path.
        // TODO: Deal with this in a better way.
        const path = handle === 'homepage' ? '/' : `/${handle}`;
        const title = page.meta_title || page.title || handle;
        const description = (page.meta_description && asText(page.meta_description)) || page.description || undefined;

        return {
            title,
            description,
            alternates: {
                canonical: `https://${domain}/${locale.locale}${path}/`,
                languages: locales.reduce(
                    (prev, { locale }) => ({
                        ...prev,
                        [locale]: `https://${domain}/${locale}${path}/`
                    }),
                    {}
                )
            }
            // TODO: Metadata.
        };
    } catch (error: any) {
        const message = (error?.message as string) || '';
        if (message.startsWith('404:')) {
            return notFoundMetadata;
        }

        throw error;
    }
}
/* c8 ignore stop */

export default async function CustomPage({
    params: { domain, locale: localeData, handle }
}: {
    params: CustomPageParams;
}) {
    if (!isValidHandle(handle)) return notFound();

    const locale = NextLocaleToLocale(localeData);
    if (!locale) return notFound();

    try {
        const i18n = await getDictionary(locale);
        const api = StorefrontApiClient({ domain, locale });
        const store = await StoreApi({ locale, api });

        const { page } = await PageApi({ domain, locale, handle, type: 'custom_page' });

        if (!page) return notFound(); // TODO: Return proper error.
        const prefetch = (page && (await Prefetch({ api, page }))) || null;

        return (
            <Page>
                <PageContent primary>
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
    } catch (error: any) {
        const message = (error?.message as string) || '';
        if (message.startsWith('404:')) {
            return notFound();
        }

        throw error;
    }
}

export const revalidate = 28_800; // 8hrs.

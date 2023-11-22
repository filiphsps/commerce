import { PageApi, PagesApi } from '@/api/page';
import { ShopApi, ShopsApi } from '@/api/shop';
import { StorefrontApiClient } from '@/api/shopify';
import { LocalesApi, StoreApi } from '@/api/store';
import { Page } from '@/components/layout/page';
import PageContent from '@/components/page-content';
import PrismicPage from '@/components/prismic-page';
import { getDictionary } from '@/i18n/dictionary';
import { isValidHandle } from '@/utils/handle';
import { DefaultLocale, NextLocaleToLocale } from '@/utils/locale';
import { Prefetch } from '@/utils/prefetch';
import { asText } from '@prismicio/client';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { metadata as notFoundMetadata } from '../not-found';

/* c8 ignore start */
export const revalidate = 28_800; // 8hrs.
export const dynamicParams = true;
export async function generateStaticParams() {
    const locale = DefaultLocale()!;
    const shops = await ShopsApi();

    return (
        await Promise.all(
            shops.map(async (shop) => {
                const api = await StorefrontApiClient({ shop, locale });
                const locales = await LocalesApi({ api });

                return await Promise.all(
                    locales.map(async (locale) => {
                        const pages = await PagesApi({ shop, locale });

                        return pages.map(({ uid: handle }) => ({
                            domain: shop.domains.primary,
                            locale: locale.locale,
                            handle
                        }));
                    })
                );
            })
        )
    ).flat(2);
}
/* c8 ignore stop */

/* c8 ignore start */
export type CustomPageParams = { domain: string; locale: string; handle: string };
export async function generateMetadata({
    params: { domain, locale: localeData, handle }
}: {
    params: CustomPageParams;
}): Promise<Metadata> {
    try {
        if (!isValidHandle(handle)) return notFoundMetadata;

        const shop = await ShopApi({ domain });
        const locale = NextLocaleToLocale(localeData);
        if (!locale) return notFoundMetadata;

        const api = await StorefrontApiClient({ shop, locale });
        const store = await StoreApi({ api, locale });
        const locales = store.i18n.locales;

        const { page } = await PageApi({ shop, locale, handle, type: 'custom_page' });
        if (!page) return notFoundMetadata;

        // If the page is the homepage we shouldn't add the handle to path.
        // TODO: Deal with this in a better way.
        const path = handle === 'homepage' ? '/' : `/${handle}/`;
        const title = page.meta_title || page.title || handle;
        const description = (page.meta_description && asText(page.meta_description)) || page.description || undefined;

        return {
            title,
            description,
            alternates: {
                canonical: `https://${domain}/${locale.locale}${path}`,
                languages: locales.reduce(
                    (prev, { locale }) => ({
                        ...prev,
                        [locale]: `https://${domain}/${locale}${path}`
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
    try {
        if (!isValidHandle(handle)) return notFound();

        const shop = await ShopApi({ domain });
        const locale = NextLocaleToLocale(localeData);
        if (!locale) return notFound();

        const i18n = await getDictionary(locale);
        const api = await StorefrontApiClient({ shop, locale });
        const store = await StoreApi({ api, locale });

        const { page } = await PageApi({ shop, locale, handle, type: 'custom_page' });

        if (!page) return notFound(); // TODO: Return proper error.
        const prefetch = (page && (await Prefetch({ api, page }))) || null;

        return (
            <Page>
                <PageContent primary>
                    {page?.slices && page?.slices.length > 0 ? (
                        <PrismicPage
                            shop={shop}
                            store={store}
                            locale={locale}
                            page={page}
                            prefetch={prefetch}
                            i18n={i18n}
                            handle={handle}
                            type={'custom_page'}
                        />
                    ) : null}
                </PageContent>
            </Page>
        );
    } catch (error: any) {
        const message = (error?.message as string) || '';
        if (message.startsWith('404:')) {
            return notFound();
        }

        console.error(error);
        throw error;
    }
}

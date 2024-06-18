import 'server-only';

import { unstable_cache as cache } from 'next/cache';
import { notFound } from 'next/navigation';

import { ShopApi, ShopsApi } from '@nordcom/commerce-database';
import { Error } from '@nordcom/commerce-errors';

import { PageApi, PagesApi } from '@/api/page';
import { ShopifyApiClient, ShopifyApolloApiClient } from '@/api/shopify';
import { LocalesApi } from '@/api/store';
import { getDictionary } from '@/i18n/dictionary';
import { isValidHandle } from '@/utils/handle';
import { Locale } from '@/utils/locale';
import { asText } from '@prismicio/client';

import PrismicPage from '@/components/prismic-page';

import type { Metadata } from 'next';

export async function generateStaticParams() {
    const shops = await ShopsApi();

    const pages = (
        await Promise.all(
            shops
                .map(async (shop) => {
                    try {
                        const api = await ShopifyApiClient({ shop });
                        const locales = await LocalesApi({ api });

                        return await Promise.all(
                            locales
                                .map(async (locale) => {
                                    try {
                                        const pages = await PagesApi({ shop, locale });

                                        return pages.map(({ uid }) => ({
                                            domain: shop.domain,
                                            locale: locale.code,
                                            handle: uid === 'homepage' ? undefined : uid
                                        }));
                                    } catch {
                                        return null;
                                    }
                                })
                                .filter((_) => _)
                        );
                    } catch {
                        return null;
                    }
                })
                .filter((_) => _)
        )
    ).flat(2);

    return pages;
}

export type CustomPageParams = { domain: string; locale: string; handle: string };
export async function generateMetadata({
    params: { domain, locale: localeData, handle }
}: {
    params: CustomPageParams;
}): Promise<Metadata> {
    try {
        if (!isValidHandle(handle)) notFound();

        const locale = Locale.from(localeData);
        if (!locale) notFound();

        const shop = await ShopApi(domain, cache);
        // Setup the AbstractApi client.
        const api = await ShopifyApolloApiClient({ shop, locale });
        // Do the actual API calls.
        const { page } = await PageApi({ shop, locale, handle });
        if (!page) notFound();
        // Extra calls,

        const locales = await LocalesApi({ api });

        // If the page is the homepage we shouldn't add the handle to path.
        // TODO: Deal with this in a better way.
        const path = handle === 'homepage' ? '/' : `/${handle}/`;

        const title = page.meta_title || page.title || handle;
        const description = (page.meta_description && asText(page.meta_description)) || page.description || undefined;
        return {
            title,
            description,
            alternates: {
                canonical: `https://${shop.domain}/${locale.code}${path}`,
                languages: locales.reduce(
                    (prev, { code }) => ({
                        ...prev,
                        [code]: `https://${shop.domain}/${code}${path}`
                    }),
                    {}
                )
            }
            // TODO: Metadata.
        };
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}

export default async function CustomPage({
    params: { domain, locale: localeCode, handle }
}: {
    params: CustomPageParams;
}) {
    try {
        if (!isValidHandle(handle)) notFound();

        // Creates a locale object from a locale code (e.g. `en-US`).
        const locale = Locale.from(localeCode);
        if (!locale) notFound();

        // Fetch the current shop.
        const shop = await ShopApi(domain, cache);

        const { page } = await PageApi({ shop, locale, handle });
        if (!page) notFound(); // TODO: Return proper error.

        // Get dictionary of strings for the current locale.
        const i18n = await getDictionary({ shop, locale });

        return <PrismicPage shop={shop} locale={locale} page={page} i18n={i18n} handle={handle} />;
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}

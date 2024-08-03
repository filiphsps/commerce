import 'server-only';

import { ShopApi } from '@nordcom/commerce-database';
import { Error } from '@nordcom/commerce-errors';

import { PageApi, PagesApi } from '@/api/page';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { LocalesApi } from '@/api/store';
import { getDictionary } from '@/i18n/dictionary';
import { isValidHandle } from '@/utils/handle';
import { Locale } from '@/utils/locale';
import { asText } from '@prismicio/client';
import { unstable_cache as cache } from 'next/cache';
import { notFound } from 'next/navigation';

import Breadcrumbs from '@/components/informational/breadcrumbs';
import PrismicPage from '@/components/prismic-page';

import type { Metadata } from 'next';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const dynamicParams = true;
export const revalidate = false;

export type CustomPageParams = { domain: string; locale: string; handle: string };

export async function generateStaticParams({
    params: { domain, locale: localeData }
}: {
    params: Omit<CustomPageParams, 'handle'>;
}): Promise<Omit<CustomPageParams, 'domain' | 'locale'>[]> {
    const locale = Locale.from(localeData);

    const shop = await ShopApi(domain, cache, true);
    const pages = await PagesApi({ shop, locale });
    if (!pages) return [];

    return pages.map(({ uid }) => ({
        handle: uid!
    }));
}

export async function generateMetadata({
    params: { domain, locale: localeData, handle }
}: {
    params: CustomPageParams;
}): Promise<Metadata> {
    try {
        if (!isValidHandle(handle)) notFound();

        const locale = Locale.from(localeData);

        const shop = await ShopApi(domain, cache);
        // Setup the AbstractApi client.
        const api = await ShopifyApolloApiClient({ shop, locale });
        // Do the actual API calls.
        const page = await PageApi({ shop, locale, handle });
        if (!page) notFound();

        const locales = await LocalesApi({ api });

        // If the page is the homepage we shouldn't add the handle to path.
        // TODO: Deal with this in a better way.
        const path = handle === 'homepage' ? '/' : `/${handle}/`;

        const title = page.meta_title || page.title || handle;
        const description = asText(page.meta_description) || page.description || undefined;
        const images = page.meta_image.url
            ? [
                  {
                      url: page.meta_image.url!,
                      width: page.meta_image.dimensions.width!,
                      height: page.meta_image.dimensions.height!
                  }
              ]
            : [];

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
            },
            openGraph: {
                url: handle,
                type: 'website',
                title,
                description,
                siteName: shop.name,
                locale: locale.code,
                images
            }
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

        // Fetch the current shop.
        const shop = await ShopApi(domain, cache);

        const page = await PageApi({ shop, locale, handle } as any);
        if (!page) notFound(); // TODO: Return proper error.

        // Get dictionary of strings for the current locale.
        const i18n = await getDictionary({ shop, locale });

        const breadcrumbs = handle !== 'homepage' && page.title ? <Breadcrumbs shop={shop} title={page.title} /> : null;

        return (
            <>
                {breadcrumbs}
                <PrismicPage shop={shop} locale={locale} page={page} i18n={i18n} handle={handle} />
            </>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}

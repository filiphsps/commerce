import 'server-only';

import { PageApi } from '@/api/page';
import { ShopApi } from '@/api/shop';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { LocalesApi } from '@/api/store';
import { Page } from '@/components/layout/page';
import PageContent from '@/components/page-content';
import PrismicPage from '@/components/prismic-page';
import { getDictionary } from '@/i18n/dictionary';
import { Error } from '@/utils/errors';
import { isValidHandle } from '@/utils/handle';
import { Locale } from '@/utils/locale';
import { asText } from '@prismicio/client';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

export const dynamicParams = true;

export type CustomPageParams = { domain: string; locale: string; handle: string };
export async function generateMetadata({
    params: { domain, locale: localeData, handle }
}: {
    params: CustomPageParams;
}): Promise<Metadata> {
    try {
        if (!isValidHandle(handle)) return notFound();

        const locale = Locale.from(localeData);
        if (!locale) return notFound();

        const shop = await ShopApi({ domain, locale });
        // Setup the AbstractApi client.
        const api = await ShopifyApolloApiClient({ shop, locale });
        // Do the actual API calls.
        const { page } = await PageApi({ shop, locale, handle });
        if (!page) return notFound();
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
                canonical: `https://${shop.domains.primary}/${locale.code}${path}`,
                languages: locales.reduce(
                    (prev, { code }) => ({
                        ...prev,
                        [code]: `https://${shop.domains.primary}/${code}${path}`
                    }),
                    {}
                )
            }
            // TODO: Metadata.
        };
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            return notFound();
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
        if (!isValidHandle(handle)) return notFound();

        // Creates a locale object from a locale code (e.g. `en-US`).
        const locale = Locale.from(localeCode);
        if (!locale) return notFound();

        // Fetch the current shop.
        const shop = await ShopApi({ domain, locale });

        const { page } = await PageApi({ shop, locale, handle });
        if (!page) return notFound(); // TODO: Return proper error.

        // Get dictionary of strings for the current locale.
        const i18n = await getDictionary({ shop, locale });

        return (
            <Page>
                <PageContent primary={true}>
                    <Suspense key={`${shop.id}.page.${handle}.content`} fallback={<PrismicPage.skeleton page={page} />}>
                        <PrismicPage shop={shop} locale={locale} page={page} i18n={i18n} handle={handle} />
                    </Suspense>
                </PageContent>
            </Page>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            return notFound();
        }

        throw error;
    }
}

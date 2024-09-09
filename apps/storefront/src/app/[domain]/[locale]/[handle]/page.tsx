import 'server-only';

import { Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';
import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';

import { PageApi, PagesApi } from '@/api/page';
import { findShopByDomainOverHttp } from '@/api/shop';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { BusinessDataApi, LocalesApi } from '@/api/store';
import { isValidHandle } from '@/utils/handle';
import { Locale } from '@/utils/locale';
import { asText } from '@prismicio/client';
import { notFound } from 'next/navigation';

import { CMSContent } from '@/components/cms/cms-content';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
import { JsonLd } from '@/components/json-ld';

import type { Metadata } from 'next';
import type { OnlineStore, WithContext } from 'schema-dts';

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
    try {
        const locale = Locale.from(localeData);

        const shop = await findShopByDomainOverHttp(domain);
        const pages = await PagesApi({ shop, locale });
        if (!pages) {
            return [];
        }

        return pages.map(({ uid }) => ({
            handle: uid!
        }));
    } catch (error: unknown) {
        console.error(error);
        return [];
    }
}

export async function generateMetadata({
    params: { domain, locale: localeData, handle }
}: {
    params: CustomPageParams;
}): Promise<Metadata> {
    if (!isValidHandle(handle)) {
        notFound();
    }

    try {
        const locale = Locale.from(localeData);

        const shop = await Shop.findByDomain(domain, { sensitiveData: true });
        const api = await ShopifyApolloApiClient({ shop, locale });

        const [page, locales] = await Promise.all([PageApi({ shop, locale, handle }), LocalesApi({ api })]);
        if (!page) {
            notFound();
        }

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
            robots: {
                index: (page.noindex as any) === undefined ? true : !page.noindex
            },
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

async function OnlineStoreJsonLd({ shop, locale }: { shop: OnlineShop; locale: Locale }) {
    try {
        const businessData = await BusinessDataApi({ shop, locale });

        // TODO: Add more data.
        const jsonLd: WithContext<OnlineStore> = {
            '@context': 'https://schema.org',
            '@type': 'OnlineStore',
            'name': shop.name,
            'url': `https://${shop.domain}/${locale.code}/`,
            'logo': shop.icons?.favicon?.src,
            'telephone': businessData.telephone || undefined,
            'email': businessData.email || undefined,
            'sameAs': (businessData.social_profiles || []).map(({ href }) => href as string), // eslint-disable-line  @typescript-eslint/no-unnecessary-condition
            'taxID': businessData.tax_number || undefined,
            'vatID': businessData.vat_number || undefined
        };

        return <JsonLd data={jsonLd} />;
    } catch (error: unknown) {
        console.error(error);
        return null;
    }
}

export default async function CustomPage({
    params: { domain, locale: localeCode, handle }
}: {
    params: CustomPageParams;
}) {
    if (!isValidHandle(handle)) {
        notFound();
    }

    try {
        // Creates a locale object from a locale code (e.g. `en-US`).
        const locale = Locale.from(localeCode);

        // Fetch the current shop.
        const shop = await Shop.findByDomain(domain, { sensitiveData: true });

        const page = await PageApi({ shop, locale, handle } as any);
        if (!page) {
            notFound(); // TODO: Return proper error.
        }

        const breadcrumbs =
            handle !== 'homepage' && page.title ? (
                <Suspense fallback={<BreadcrumbsSkeleton />}>
                    <div className="-mb-[1.5rem] empty:hidden md:-mb-[2.25rem]">
                        <Breadcrumbs locale={locale} title={page.title} />
                    </div>
                </Suspense>
            ) : null;

        return (
            <>
                {breadcrumbs}

                <CMSContent shop={shop} locale={locale} handle={handle} />

                {/* Metadata */}
                {handle === 'homepage' ? (
                    <Suspense>
                        <OnlineStoreJsonLd shop={shop} locale={locale} />
                    </Suspense>
                ) : null}
            </>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}

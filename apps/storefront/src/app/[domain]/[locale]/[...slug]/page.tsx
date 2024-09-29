import 'server-only';

import { Fragment, Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';
import { Shop } from '@nordcom/commerce-db';

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

import type { PageData } from '@/api/prismic/page';
import type { Metadata } from 'next';
import type { OnlineStore, WithContext } from 'schema-dts';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const dynamicParams = true;
export const revalidate = false;

export type CustomPageParams = Promise<{ domain: string; locale: string; slug: string[] }>;

export async function generateStaticParams({
    params
}: {
    params: Omit<CustomPageParams, 'slug'>;
}): Promise<Omit<Awaited<CustomPageParams>, 'domain' | 'locale'>[]> {
    const { domain, locale: localeData } = await params;

    try {
        const locale = Locale.from(localeData);

        const shop = await findShopByDomainOverHttp(domain);
        const pages = await PagesApi({ shop, locale });
        if (!pages) {
            return [];
        }

        return pages.map(({ uid }) => ({
            slug: [uid!] // TODO: Handle nested paths.
        }));
    } catch (error: unknown) {
        console.error(error);
        return [];
    }
}

export async function generateMetadata({ params }: { params: CustomPageParams }): Promise<Metadata> {
    const { domain, locale: localeData, slug } = await params;

    const handle = slug.join('/');
    if (!isValidHandle(handle)) {
        notFound();
    }

    const locale = Locale.from(localeData);

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const api = await ShopifyApolloApiClient({ shop, locale });

    const page = (await PageApi({ shop, locale, handle })) as PageData<'custom_page'> | null;
    if (!page) {
        notFound();
    }

    const locales = await LocalesApi({ api });

    // If the page is the homepage we shouldn't add the handle to path.
    // TODO: Deal with this in a better way.
    const path = handle === 'homepage' ? '/' : `/${handle}/`;

    const title = page.meta_title || page.title || handle;
    const description = asText(page.meta_description) || page.description || undefined;
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
            url: handle !== 'homepage' ? handle : undefined,
            type: 'website',
            title,
            description,
            siteName: `${shop.name} (${locale.country!})`,
            locale: locale.code,
            images: page.meta_image.url
                ? [
                      {
                          url: page.meta_image.url!,
                          width: page.meta_image.dimensions.width!,
                          height: page.meta_image.dimensions.height!
                      }
                  ]
                : []
        }
    };
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
            'image': shop.icons?.favicon?.src,
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

async function PageBreadcrumbs({ shop, locale, handle }: { shop: OnlineShop; locale: Locale; handle: string }) {
    const page = (await PageApi({ shop, locale, handle })) as PageData<'custom_page'> | null; // TODO: Page api should return a proper error.
    if (!page) {
        notFound();
    }

    if (handle === 'homepage' || !page.title) {
        return null;
    }

    return (
        <div className="-mb-[1.25rem] empty:hidden md:-mb-[2.25rem]">
            <Suspense key={`pages.${handle}.breadcrumbs.content`} fallback={<BreadcrumbsSkeleton />}>
                <Breadcrumbs locale={locale} title={page.title} />
            </Suspense>
        </div>
    );
}

export default async function CustomPage({ params }: { params: CustomPageParams }) {
    const { domain, locale: localeData, slug } = await params;

    const handle = slug.join('/');
    if (!isValidHandle(handle)) {
        notFound();
    }

    // Creates a locale object from a locale code (e.g. `en-US`).
    const locale = Locale.from(localeData);

    // Fetch the current shop.
    const shop = await Shop.findByDomain(domain, { sensitiveData: true });

    return (
        <>
            <Suspense key={`pages.${handle}.breadcrumbs`} fallback={<Fragment />}>
                <PageBreadcrumbs shop={shop} locale={locale} handle={handle} />
            </Suspense>

            <Suspense key={`pages.${handle}.content`} fallback={<Fragment />}>
                <CMSContent shop={shop} locale={locale} handle={handle} />
            </Suspense>

            {/* Metadata */}
            {handle === 'homepage' ? (
                <Suspense key={`pages.${handle}.jsonld.online-store`} fallback={<Fragment />}>
                    <OnlineStoreJsonLd shop={shop} locale={locale} />
                </Suspense>
            ) : null}
        </>
    );
}

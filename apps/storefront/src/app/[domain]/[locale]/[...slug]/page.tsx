import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import { Shop } from '@nordcom/commerce-db';
import { Error, UnknownShopDomainError } from '@nordcom/commerce-errors';
import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { notFound, unstable_rethrow } from 'next/navigation';
import { Fragment, Suspense } from 'react';
import type { OnlineStore, WithContext } from 'schema-dts';
import { PageApi } from '@/api/page';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { LocalesApi } from '@/api/store';
import { CMSContent } from '@/components/cms/cms-content';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
import { JsonLd } from '@/components/json-ld';
import { isValidHandle, NOT_FOUND_HANDLE } from '@/utils/handle';
import { Locale } from '@/utils/locale';
import type { CustomPageParams } from './static-params';

export { type CustomPageParams, generateStaticParams } from './static-params';

export async function generateMetadata({ params }: { params: CustomPageParams }): Promise<Metadata> {
    'use cache';
    cacheLife('max');

    const { domain, locale: localeData, slug } = await params;
    if (!domain || domain === NOT_FOUND_HANDLE) {
        notFound();
    }

    const handle = slug.join('/');
    if (!handle || !isValidHandle(handle)) {
        notFound();
    }

    let locale: Locale;
    try {
        // Creates a locale object from a locale code (e.g. `en-US`).
        locale = Locale.from(localeData);
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        console.error(error);
        unstable_rethrow(error);
        throw error;
    }

    let shop: OnlineShop;
    try {
        // Fetch the current shop.
        shop = await Shop.findByDomain(domain, { sensitiveData: true });
    } catch (error: unknown) {
        if (Error.isNotFound(error) || error instanceof UnknownShopDomainError) {
            notFound();
        }

        console.error(error);
        unstable_rethrow(error);
        throw error;
    }

    const api = await ShopifyApolloApiClient({ shop, locale });

    const page = await PageApi({ shop, locale, handle });
    if (!page) {
        notFound();
    }

    const locales = await LocalesApi({ api });

    // If the page is the homepage we shouldn't add the handle to path.
    // TODO: Deal with this in a better way.
    const path = handle === 'homepage' ? '/' : `/${handle}/`;

    let title: string = handle;
    let description: string | undefined;
    let index = true;
    let images: NonNullable<Metadata['openGraph']>['images'] = [];

    switch (page.provider) {
        case 'cms': {
            const data = page.data as {
                title?: string;
                seo?: { title?: string; description?: string; noindex?: boolean; image?: { url?: string } };
            };
            title = data.seo?.title || data.title || handle;
            description = data.seo?.description || undefined;
            index = data.seo?.noindex !== true;
            images = data.seo?.image?.url ? [{ url: data.seo.image.url }] : [];
            break;
        }
        case 'shopify': {
            const data = page.data;
            title = data.seo.title || data.title || handle;
            description = data.seo.description || undefined;
            // Shopify has no noindex field; default to indexed.
            // Shopify has no meta_image at the page level; default to empty.
            break;
        }
    }

    return {
        title,
        description,
        robots: { index },
        alternates: {
            canonical: `https://${shop.domain}/${locale.code}${path}`,
            languages: Object.fromEntries(locales.map(({ code }) => [code, `https://${shop.domain}/${code}${path}`])),
        },
        openGraph: {
            url: handle !== 'homepage' ? handle : undefined,
            type: 'website',
            title,
            description,
            siteName: `${shop.name} (${locale.country})`,
            locale: locale.code,
            images,
        },
    };
}

function OnlineStoreJsonLd({ shop, locale }: { shop: OnlineShop; locale: Locale }) {
    const jsonLd: WithContext<OnlineStore> = {
        '@context': 'https://schema.org',
        '@type': 'OnlineStore',
        name: shop.name,
        url: `https://${shop.domain}/${locale.code}/`,
        image: shop.icons?.favicon?.src,
        logo: shop.icons?.favicon?.src,
    };

    return <JsonLd data={jsonLd} />;
}

async function PageBreadcrumbs({ shop, locale, handle }: { shop: OnlineShop; locale: Locale; handle: string }) {
    const page = await PageApi({ shop, locale, handle });
    if (!page) {
        notFound();
    }

    const title = page.data.title as string | null;

    if (handle === 'homepage' || !title) {
        return null;
    }

    return (
        <div className="-mb-5 empty:hidden md:-mb-9">
            <Suspense key={`pages.${handle}.breadcrumbs.content`} fallback={<BreadcrumbsSkeleton />}>
                <Breadcrumbs locale={locale} title={title} />
            </Suspense>
        </div>
    );
}

export default async function CustomPage({ params }: { params: CustomPageParams }) {
    'use cache';
    cacheLife('max');

    const { domain, locale: localeData, slug } = await params;
    if (!domain || domain === NOT_FOUND_HANDLE) {
        notFound();
    }

    const handle = slug.join('/');
    if (!isValidHandle(handle)) {
        notFound();
    }

    let locale: Locale;
    try {
        // Creates a locale object from a locale code (e.g. `en-US`).
        locale = Locale.from(localeData);
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        console.error(error);
        unstable_rethrow(error);
        throw error;
    }

    let shop: OnlineShop;
    try {
        // Fetch the current shop.
        shop = await Shop.findByDomain(domain, { sensitiveData: true });
    } catch (error: unknown) {
        if (Error.isNotFound(error) || error instanceof UnknownShopDomainError) {
            notFound();
        }

        console.error(error);
        unstable_rethrow(error);
        throw error;
    }

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

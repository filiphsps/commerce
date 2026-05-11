import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import { Shop } from '@nordcom/commerce-db';
import { NotFoundError } from '@nordcom/commerce-errors';
import { asText } from '@prismicio/client';
import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';
import { Fragment, Suspense } from 'react';
import type { OnlineStore, WithContext } from 'schema-dts';
import { PageApi, PagesApi } from '@/api/page';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { BusinessDataApi, LocalesApi } from '@/api/store';
import { CMSContent } from '@/components/cms/cms-content';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
import { JsonLd } from '@/components/json-ld';
import { isValidHandle } from '@/utils/handle';
import { Locale } from '@/utils/locale';

export type CustomPageParams = Promise<{ domain: string; locale: string; slug: string[] }>;

export async function generateStaticParams({
    params,
}: {
    params: Omit<Awaited<CustomPageParams>, 'slug'>;
}): Promise<Omit<Awaited<CustomPageParams>, 'domain' | 'locale'>[]> {
    const { domain, locale: localeData } = params;

    const locale = Locale.from(localeData);

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const pages = await PagesApi({ shop, locale });
    if (!pages) {
        throw new NotFoundError('pages');
    }

    let slugs: { slug: string[] }[] = [];
    switch (pages.provider) {
        case 'prismic':
            slugs = pages.items
                .filter((p): p is typeof p & { uid: string } => typeof p.uid === 'string')
                .map(({ uid }) => ({ slug: [uid] }));
            break;
        case 'shopify':
            slugs = pages.items.map(({ handle }) => ({ slug: [handle] }));
            break;
    }

    if (slugs.length === 0) {
        throw new NotFoundError('pages');
    }

    return slugs;
}

export async function generateMetadata({ params }: { params: CustomPageParams }): Promise<Metadata> {
    'use cache';
    cacheLife('max');

    const { domain, locale: localeData, slug } = await params;

    const handle = slug.join('/');
    if (!isValidHandle(handle)) {
        notFound();
    }

    const locale = Locale.from(localeData);

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
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
        case 'prismic': {
            const data = page.data;
            title = data.meta_title || data.title || handle;
            description = asText(data.meta_description) || data.description || undefined;
            index = typeof data.noindex === 'undefined' ? true : !data.noindex;
            images = data.meta_image.url
                ? [
                      {
                          url: data.meta_image.url,
                          width: data.meta_image.dimensions.width,
                          height: data.meta_image.dimensions.height,
                      },
                  ]
                : [];
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

async function OnlineStoreJsonLd({ shop, locale }: { shop: OnlineShop; locale: Locale }) {
    let jsonLd: WithContext<OnlineStore>;
    try {
        const businessData = await BusinessDataApi({ shop, locale });
        if (!businessData) return null;

        // TODO: Add more data.
        jsonLd = {
            '@context': 'https://schema.org',
            '@type': 'OnlineStore',
            name: shop.name,
            url: `https://${shop.domain}/${locale.code}/`,
            image: shop.icons?.favicon?.src,
            logo: shop.icons?.favicon?.src,
            telephone: businessData.telephone || undefined,
            email: businessData.email || undefined,
            sameAs: (businessData.social_profiles || []).map(({ href }) => href as string),
            taxID: businessData.tax_number || undefined,
            vatID: businessData.vat_number || undefined,
        };
    } catch (error: unknown) {
        console.error(error);
        return null;
    }

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
        <div className="-mb-[1.25rem] empty:hidden md:-mb-[2.25rem]">
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

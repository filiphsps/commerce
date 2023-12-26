import { PageApi } from '@/api/page';
import { ShopApi } from '@/api/shop';
import { ShopifyApolloApiClient } from '@/api/shopify';
import PageContent from '@/components/page-content';
import Heading from '@/components/typography/heading';
import { getDictionary } from '@/i18n/dictionary';
import { Error } from '@/utils/errors';
import { Locale, useTranslation } from '@/utils/locale';
import { Prefetch } from '@/utils/prefetch';
import { asText } from '@prismicio/client';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

export type ProductsPageParams = { domain: string; locale: string };
export async function generateMetadata({
    params: { domain, locale: localeData }
}: {
    params: ProductsPageParams;
}): Promise<Metadata> {
    try {
        const locale = Locale.from(localeData);
        if (!locale) return notFound();

        const shop = await ShopApi(domain);

        const { page } = await PageApi({ shop, locale, handle: 'products', type: 'custom_page' });
        const i18n = await getDictionary(locale);
        const { t } = useTranslation('common', i18n);

        const title = page?.meta_title || page?.title || t('products');
        const description = (page?.meta_description && asText(page.meta_description)) || page?.description || undefined;
        return {
            title,
            description,
            alternates: {
                canonical: `https://${shop.domains.primary}/${locale.code}/products/`
            },
            openGraph: {
                url: `/products/`,
                type: 'website',
                title,
                description,
                siteName: shop.name,
                locale: locale.code,
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
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            return notFound();
        }

        throw error;
    }
}

export default async function ProductsPage({ params: { domain, locale: localeData } }: { params: ProductsPageParams }) {
    try {
        const shop = await ShopApi(domain);
        const locale = Locale.from(localeData);
        if (!locale) return notFound();

        const api = await ShopifyApolloApiClient({ shop, locale });
        const { page } = await PageApi({ shop, locale, handle: 'products', type: 'custom_page' });

        void Prefetch({ api, page });

        redirect(`/${locale.code}/`);

        return (
            <PageContent primary={true}>
                <Heading title={page?.title} subtitle={page?.description} />
            </PageContent>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            return notFound();
        }

        throw error;
    }
}

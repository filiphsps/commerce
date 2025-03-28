import { Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';
import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';

import { ShopifyApolloApiClient } from '@/api/shopify';
import { ProductApi } from '@/api/shopify/product';
import { getDictionary } from '@/utils/dictionary';
import { isValidHandle } from '@/utils/handle';
import { getTranslations, Locale } from '@/utils/locale';
import { notFound } from 'next/navigation';

import { Card } from '@/components/layout/card';
import { RecommendedProducts } from '@/components/products/recommended-products';

import type { ProductPageParams } from '@/pages/products/[handle]/page';

async function Content({ shop, locale, handle }: { shop: OnlineShop; locale: Locale; handle: string }) {
    const api = await ShopifyApolloApiClient({ shop, locale });

    const [product, productError] = await ProductApi({
        api,
        handle,
        fragment: /* GraphQL */ `
            id
            handle
        `
    });
    if (productError) {
        if (Error.isNotFound(productError)) {
            notFound();
        }

        console.error(productError);
        throw productError;
    }

    return <RecommendedProducts shop={shop} locale={locale} product={product} className="px-3" />;
}

export default async function ProductModalRecommendations({ params }: Readonly<{ params: ProductPageParams }>) {
    const { domain, locale: localeData, handle } = await params;
    if (!isValidHandle(handle)) {
        notFound();
    }

    const locale = Locale.from(localeData);
    const shop = await Shop.findByDomain(domain, { sensitiveData: true });

    const i18n = await getDictionary({ shop, locale });
    const { t } = getTranslations('product', i18n);

    return (
        <Card className="mt-2 flex w-full flex-col gap-3 px-0 lg:mt-6" border={true}>
            <h2 className="block px-3 text-2xl font-medium leading-tight" data-nosnippet={true}>
                {t('you-may-also-like')}
            </h2>

            <Suspense fallback={<RecommendedProducts.skeleton className="px-3" />}>
                <Content shop={shop} locale={locale} handle={handle} />
            </Suspense>
        </Card>
    );
}

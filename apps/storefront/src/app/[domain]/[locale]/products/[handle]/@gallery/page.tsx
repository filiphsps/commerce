import { Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';
import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';

import { ShopifyApolloApiClient } from '@/api/shopify';
import { ProductApi } from '@/api/shopify/product';
import { getDictionary } from '@/utils/dictionary';
import { isValidHandle } from '@/utils/handle';
import { Locale } from '@/utils/locale';
import { notFound } from 'next/navigation';

import { ProductGallery } from '@/components/products/product-gallery';

import type { ProductPageParams } from '@/pages/products/[handle]/page';

async function Content({ shop, locale, handle }: { shop: OnlineShop; locale: Locale; handle: string }) {
    const api = await ShopifyApolloApiClient({ shop, locale });

    const [product, productError] = await ProductApi({
        api,
        handle,
        fragment: /* GraphQL */ `
            handle

            featuredImage {
                id
                altText
                url(transform: { preferredContentType: WEBP })
                height
                width
            }
            images(first: 250) {
                edges {
                    node {
                        id
                        altText
                        url(transform: { preferredContentType: WEBP })
                        height
                        width
                    }
                }
            }
        `
    });
    if (productError) {
        if (Error.isNotFound(productError)) {
            notFound();
        }

        console.error(productError);
        throw productError;
    }

    const i18n = await getDictionary({ shop, locale });

    return (
        <ProductGallery
            product={product}
            i18n={i18n}
            initialImageId={product.featuredImage?.id}
            images={product.images.edges.map((edge) => edge.node)}
            pageUrl={`https://${shop.domain}/${locale.code}/products/${handle}/`}
            enableShare={false}
            padding={false}
            className="w-full snap-start snap-always overflow-hidden [&>*]:inset-y-0 [&>*]:shrink [&>*]:md:relative"
            primaryImageClassName="aspect-[4/3] md:aspect-auto"
        />
    );
}

export default async function ProductModalGallery({ params }: Readonly<{ params: ProductPageParams }>) {
    const { domain, locale: localeData, handle } = await params;
    if (!isValidHandle(handle)) {
        notFound();
    }

    const locale = Locale.from(localeData);
    const shop = await Shop.findByDomain(domain, { sensitiveData: true });

    return (
        <Suspense
            fallback={
                <div className="flex w-full gap-2 md:h-full md:flex-col lg:gap-4">
                    <div className="relative w-full grow overflow-hidden rounded-lg border-2 border-solid border-gray-100 bg-white md:h-full">
                        <div className="aspect-[4/3] w-full md:aspect-auto md:max-h-[30rem]" data-skeleton />
                    </div>
                </div>
            }
        >
            <Content shop={shop} locale={locale} handle={handle} />
        </Suspense>
    );
}

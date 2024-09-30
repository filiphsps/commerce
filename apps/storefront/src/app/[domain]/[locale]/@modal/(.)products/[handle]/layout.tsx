import { Suspense } from 'react';

import { Shop } from '@nordcom/commerce-db';

//import { Error } from '@nordcom/commerce-errors';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { ProductApi } from '@/api/shopify/product';
import { getDictionary } from '@/utils/dictionary';
import { firstAvailableVariant } from '@/utils/first-available-variant';
import { isValidHandle } from '@/utils/handle';
import { getTranslations, Locale } from '@/utils/locale';
import { notFound } from 'next/navigation';

import { Modal, ModalCard } from '@/components/layout/modal';

import { type ProductPageParams } from '../../../products/[handle]/page';
import { ProductSavings } from '../../../products/[handle]/product-content';

import type { ReactNode } from 'react';

export default async function ProductModalLayout({
    params,
    gallery,
    children,
    description,
    recommendations
}: Readonly<{
    params: ProductPageParams;
    gallery: ReactNode;
    children: ReactNode;
    description: ReactNode;
    recommendations: ReactNode;
}>) {
    const { domain, locale: localeData, handle } = await params;
    if (!isValidHandle(handle)) {
        notFound();
    }

    const locale = Locale.from(localeData);
    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const api = await ShopifyApolloApiClient({ shop, locale });
    const product = await ProductApi({ api, handle });

    const initialVariant = firstAvailableVariant(product);
    if (!initialVariant) {
        notFound();
    }

    const i18n = await getDictionary({ shop, locale });
    const { t } = getTranslations('product', i18n);

    let title = product.title.trim();
    if (
        product.productType &&
        product.productType.length > 0 &&
        title.toLowerCase().endsWith(product.productType.toLowerCase())
    ) {
        title = title.slice(0, -product.productType.length).trim();
    }

    return (
        <Modal
            i18n={i18n}
            title={`${title}${product.productType ? ` — ${product.productType}` : ''} ${product.vendor ? `${t('by')} ${product.vendor}` : ''}`}
            description={product.description}
        >
            <ModalCard>
                <div className="flex h-full max-w-full flex-col items-start justify-stretch gap-3 px-0 md:flex-row md:flex-nowrap md:gap-4">
                    <Suspense>{gallery}</Suspense>

                    <section className="flex w-full grow flex-col gap-2 overflow-hidden md:max-w-[34rem] md:gap-3">
                        <Suspense
                            key={`products.${handle}.details.savings`}
                            fallback={<div className="h-24 w-full" data-skeleton />}
                        >
                            <ProductSavings product={product} i18n={i18n} />
                        </Suspense>

                        <Suspense>{children}</Suspense>

                        <Suspense>{description}</Suspense>
                    </section>
                </div>
            </ModalCard>

            <ModalCard className="px-0" /* horizontal padding is handled by the collection block component. */>
                <Suspense>{recommendations}</Suspense>
            </ModalCard>
        </Modal>
    );
}

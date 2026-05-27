import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import { Check as CheckIcon, Clock as ClockIcon } from 'lucide-react';
import type { HTMLProps } from 'react';
import type { Product } from '@/api/product';
import { Label } from '@/components/typography/label';
import { COMMERCE_DEFAULTS } from '@/utils/build-config';
import { firstAvailableVariant } from '@/utils/first-available-variant';
import { productInfoLines } from '@/utils/flags/definitions/product-info-lines';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { getTranslations } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

export type StockStatusProps = {
    product?: Product;
    i18n: LocaleDictionary;
} & Omit<HTMLProps<HTMLDivElement>, 'children'>;
/**
 * Displays an in-stock count badge or a back-order notice depending on variant availability.
 *
 * @param props.product - Product providing availability and inventory data.
 * @param props.i18n - Locale dictionary for stock status labels.
 * @returns The stock status section, or `null` when the product is absent or has no positive inventory.
 */
const StockStatus = ({ product, i18n, className, ...props }: StockStatusProps) => {
    const { t } = getTranslations('product', i18n);
    if (!product) {
        return null;
    }

    // `currentlyNotInStock` flags merchandise that the merchant is still
    // selling (availableForSale) without on-hand inventory — i.e. a back-order.
    // Distinguishing it from "in stock" prevents a misleading green checkmark.
    const variant = firstAvailableVariant(product);
    const isBackOrder = product.availableForSale && variant?.currentlyNotInStock === true;

    if (isBackOrder) {
        return (
            <section
                className={cn('flex items-center justify-start gap-1 *:text-amber-600 *:leading-none', className)}
                title={t('back-order')}
                {...props}
            >
                <ClockIcon className="stroke-2 align-middle text-base" />
                <Label className="font-semibold text-base normal-case">{t('back-order')}</Label>
            </section>
        );
    }

    if (!product.totalInventory || product.totalInventory <= 0) {
        return null;
    }

    return (
        <section
            className={cn('flex items-center justify-start gap-1 *:text-green-600 *:leading-none', className)}
            title={t('in-stock-and-available')}
            {...props}
        >
            <CheckIcon className="stroke-2 align-middle text-base" />
            <Label className="font-semibold text-base normal-case">
                {product.totalInventory ? t('n-in-stock', product.totalInventory.toString()) : t('in-stock')}
            </Label>
        </section>
    );
};
StockStatus.displayName = 'Nordcom.Products.StockStatus';

export type GetOrderByEstimateProps = {
    product?: Product;
    i18n: LocaleDictionary;
    locale: Locale;
    processingTimeInDays: number;
} & Omit<HTMLProps<HTMLDivElement>, 'children'>;

/**
 * Displays a dispatch-within estimate based on the shop's configured processing time.
 *
 * @param props.product - Product used to gate rendering; returns `null` when absent.
 * @param props.i18n - Locale dictionary for the dispatch label.
 * @param props.processingTimeInDays - Number of business days within which the order is dispatched.
 * @returns The estimate section, or `null` when no product is provided.
 */
export const GetOrderByEstimate = ({
    product,
    i18n,
    processingTimeInDays,
    className,
    ...props
}: GetOrderByEstimateProps) => {
    const { t } = getTranslations('product', i18n);
    if (!product) {
        return null;
    }

    return (
        <section className={cn('flex items-center justify-start gap-1', className)} {...props}>
            <Label className="font-semibold text-base normal-case">
                {t('dispatch-within-n-business-days', processingTimeInDays)}
            </Label>
        </section>
    );
};

export type InfoLinesProps = {
    shop: OnlineShop;
    product?: Product;
    i18n: LocaleDictionary;
    locale: Locale;
} & Omit<HTMLProps<HTMLDivElement>, 'children'>;

/**
 * Async server component composing `StockStatus` and `GetOrderByEstimate` behind a feature flag.
 *
 * @param props.shop - Shop record used to evaluate the `productInfoLines` feature flag and read processing time.
 * @param props.product - Product to display info lines for; returns `null` when absent.
 * @param props.i18n - Locale dictionary forwarded to sub-components.
 * @param props.locale - Locale forwarded to `GetOrderByEstimate`.
 * @returns The info-lines container, or `null` when the product is absent or the flag is disabled.
 */
const InfoLines = async ({ shop, product, i18n, locale, className, ...props }: InfoLinesProps) => {
    // Inside cached subtree → .evaluate(shop). Trade-offs in defineFlag JSDoc.
    const productInfoLinesEnabled = productInfoLines.evaluate(shop);
    if (!product || !productInfoLinesEnabled) {
        return null;
    }

    const processingTimeInDays = shop.commerce?.processingTimeInDays ?? COMMERCE_DEFAULTS.processingTimeInDays;

    return (
        <div className={cn('flex w-full select-none flex-col items-start gap-4 empty:hidden', className)} {...props}>
            {product.availableForSale ? (
                <>
                    <StockStatus product={product} i18n={i18n} />
                    <GetOrderByEstimate
                        product={product}
                        i18n={i18n}
                        locale={locale}
                        processingTimeInDays={processingTimeInDays}
                    />
                </>
            ) : null}
        </div>
    );
};
InfoLines.displayName = 'Nordcom.Products.InfoLines';

/**
 * Placeholder skeleton for `InfoLines` while asynchronous data loads.
 *
 * @returns Two skeleton bar elements matching the typical info-lines layout.
 */
function infoLinesSkeleton() {
    return (
        <div className="flex w-full select-none flex-col items-start gap-4 empty:hidden">
            <div className="h-4 w-32 rounded-sm bg-gray-200" data-skeleton />
            <div className="h-4 w-48 rounded-sm bg-gray-200" data-skeleton />
        </div>
    );
}
InfoLines.skeleton = infoLinesSkeleton as typeof infoLinesSkeleton & { displayName: string };
InfoLines.skeleton.displayName = 'Nordcom.Products.InfoLines.Skeleton';

export { InfoLines, StockStatus };

import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import { get } from '@vercel/edge-config';
import { Check as CheckIcon } from 'lucide-react';
import type { HTMLProps } from 'react';
import type { Product } from '@/api/product';
import { Label } from '@/components/typography/label';
import { COMMERCE_DEFAULTS } from '@/utils/build-config';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { getTranslations } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

export type StockStatusProps = {
    product?: Product;
    i18n: LocaleDictionary;
} & Omit<HTMLProps<HTMLDivElement>, 'children'>;
const StockStatus = ({ product, i18n, className, ...props }: StockStatusProps) => {
    const { t } = getTranslations('product', i18n);
    if (!product?.totalInventory || product.totalInventory <= 0) {
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

const InfoLines = async ({ shop, product, i18n, locale, className, ...props }: InfoLinesProps) => {
    // Avoid `showProductInfoLines()` here — `@vercel/flags/next`'s `flag()` wrapper
    // reads request headers internally, which is forbidden inside the `'use cache'` scope
    // that wraps this component's parent. The underlying edge-config value is global.
    const productInfoLinesEnabled = await get<boolean>('product-page-info-lines');
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

export { InfoLines, StockStatus };

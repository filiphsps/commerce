import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import { connection } from 'next/server';
import type { HTMLProps } from 'react';
import { PaymentIcon } from 'react-payment-brand-icons';
import { ShopifyApiClient } from '@/api/shopify';
import { ShopPaymentSettingsApi } from '@/api/store';

import type { Locale } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

const CARD_STYLES = 'aspect-[16_10] h-fit w-10 object-fill object-center';

export type AcceptedPaymentMethodsProps = {
    locale: Locale;
    shop: OnlineShop;
} & HTMLProps<HTMLDivElement>;

/**
 * Async server component displaying accepted payment method and digital wallet icons for the shop.
 *
 * @param props.shop - Shop record used to build the Shopify API client.
 * @param props.locale - Active locale forwarded to the API client.
 * @param props.className - Additional CSS class names.
 * @returns A row of payment brand icons, or `null` when none are configured.
 */
export const AcceptedPaymentMethods = async ({ shop, locale, className, ...props }: AcceptedPaymentMethodsProps) => {
    // The tenant lookup powering this client reads private storefront tokens
    // (taint-guarded, so not `'use cache'`-able) and bottoms out in a mongoose
    // `.exec()` that touches `new Date()` deep in the driver. Under Cache
    // Components that time read aborts the prerender unless request data is read
    // first, so defer to request time. Both call sites render us inside a
    // `<Suspense>`, satisfying the partial-prerender fallback requirement.
    await connection();

    const api = await ShopifyApiClient({ shop, locale });
    const paymentSettings = await ShopPaymentSettingsApi({ api });
    if (!paymentSettings) {
        return null;
    }

    const methods = paymentSettings.acceptedCardBrands.map((i) => i.toLowerCase());
    const wallets = paymentSettings.supportedDigitalWallets.map((i) => i.toLowerCase());
    if ([...methods, ...wallets].length <= 0) {
        return null;
    }

    return (
        <div
            {...props}
            className={cn(
                className,
                'flex flex-wrap items-center justify-center gap-1 overflow-hidden empty:hidden md:gap-2',
            )}
        >
            {methods.map((method) => (
                <PaymentIcon
                    key={`method_${method}`}
                    name={method}
                    className={CARD_STYLES}
                    width={38}
                    height={24}
                    title={method.replaceAll('_', ' ')}
                />
            ))}

            {wallets.map((method) => (
                <PaymentIcon
                    key={`wallet_${method}`}
                    name={method}
                    className={CARD_STYLES}
                    width={38}
                    height={24}
                    title={method.replaceAll('_', ' ')}
                />
            ))}
        </div>
    );
};

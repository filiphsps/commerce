import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
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
    /** Accessible group name for the icon list; defaults to English when omitted. */
    label?: string;
} & HTMLProps<HTMLUListElement>;

/**
 * Async server component displaying accepted payment method and digital wallet icons for the shop,
 * rendered as a labeled list so assistive tech announces it as the accepted-payment-methods group
 * rather than a bare run of images.
 *
 * @param props.shop - Shop record used to build the Shopify API client.
 * @param props.locale - Active locale forwarded to the API client.
 * @param props.label - Localized accessible group name; defaults to English.
 * @param props.className - Additional CSS class names.
 * @returns A labeled list of payment brand icons, or `null` when none are configured.
 */
export const AcceptedPaymentMethods = async ({
    shop,
    locale,
    label = 'Accepted payment methods',
    className,
    ...props
}: AcceptedPaymentMethodsProps) => {
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
        <ul
            {...props}
            aria-label={label}
            className={cn(
                className,
                'flex list-none flex-wrap items-center justify-center gap-1 overflow-hidden empty:hidden md:gap-2',
            )}
        >
            {methods.map((method) => (
                <li key={`method_${method}`} className="flex">
                    <PaymentIcon
                        name={method}
                        className={CARD_STYLES}
                        width={38}
                        height={24}
                        title={method.replaceAll('_', ' ')}
                    />
                </li>
            ))}

            {wallets.map((method) => (
                <li key={`wallet_${method}`} className="flex">
                    <PaymentIcon
                        name={method}
                        className={CARD_STYLES}
                        width={38}
                        height={24}
                        title={method.replaceAll('_', ' ')}
                    />
                </li>
            ))}
        </ul>
    );
};

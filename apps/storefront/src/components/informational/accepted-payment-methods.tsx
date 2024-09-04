import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';

import { ShopifyApiClient } from '@/api/shopify';
import { ShopPaymentSettingsApi } from '@/api/store';
import { cn } from '@/utils/tailwind';
import Image from 'next/image';

import type { Locale } from '@/utils/locale';
import type { HTMLProps } from 'react';

const CARD_STYLES = 'aspect-[16_10] h-fit w-10 object-fill object-center';

export type AcceptedPaymentMethodsProps = {
    locale: Locale;
    shop: OnlineShop;
} & HTMLProps<HTMLDivElement>;
export const AcceptedPaymentMethods = async ({ shop, locale, className, ...props }: AcceptedPaymentMethodsProps) => {
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
                'flex flex-wrap items-center justify-center gap-1 overflow-hidden empty:hidden md:gap-2'
            )}
        >
            {methods.map((method) => (
                <Image
                    key={`method_${method}`}
                    className={CARD_STYLES}
                    src={`/assets/payments/${method}.svg`}
                    alt={method}
                    height={24}
                    width={38}
                    sizes="38px"
                    title={method.replaceAll('_', ' ')}
                    priority={false}
                    loading="lazy"
                    decoding="async"
                    loader={undefined}
                    draggable={false}
                    unoptimized={true}
                />
            ))}

            {wallets.map((method) => (
                <Image
                    key={`wallet_${method}`}
                    className={CARD_STYLES}
                    src={`/assets/payments/${method}.svg`}
                    alt={method}
                    height={24}
                    width={38}
                    sizes="38px"
                    title={method.replaceAll('_', ' ')}
                    priority={false}
                    loading="lazy"
                    decoding="async"
                    loader={undefined}
                    draggable={false}
                    unoptimized={true}
                />
            ))}
        </div>
    );
};

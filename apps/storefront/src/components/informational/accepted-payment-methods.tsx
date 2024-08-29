import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';

import { ShopifyApiClient } from '@/api/shopify';
import { ShopPaymentSettingsApi } from '@/api/store';
import { cn } from '@/utils/tailwind';
import Image from 'next/image';

import type { Locale } from '@/utils/locale';
import type { HTMLProps } from 'react';

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

    const methods = paymentSettings.acceptedCardBrands.map((i) => i.toLowerCase()) || [];
    const wallets = paymentSettings.supportedDigitalWallets.map((i) => i.toLowerCase()) || [];
    if ([...methods, ...wallets].length <= 0) {
        return null;
    }

    return (
        <div {...props} className={cn(className, 'empty:*: flex flex-wrap items-center justify-center gap-1')}>
            {methods.map((method) => (
                <Image
                    key={`method_${method}`}
                    className={'h-8 w-10 object-contain object-center'}
                    src={`/assets/payments/${method}.svg`}
                    alt={method}
                    height={15}
                    width={35}
                    sizes="35px"
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
                    className={'h-8 w-10 object-contain object-center'}
                    src={`/assets/payments/${method}.svg`}
                    alt={method}
                    height={15}
                    width={35}
                    sizes="35px"
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

import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';

import { ShopifyApolloApiClient } from '@/api/shopify';
import { StoreApi } from '@/api/store';
import { cn } from '@/utils/tailwind';
import Image from 'next/image';

import type { Locale } from '@/utils/locale';
import type { HTMLProps } from 'react';

export type AcceptedPaymentMethodsProps = {
    locale: Locale;
    shop: OnlineShop;
} & HTMLProps<HTMLDivElement>;
export const AcceptedPaymentMethods = async ({ shop, locale, className, ...props }: AcceptedPaymentMethodsProps) => {
    const api = await ShopifyApolloApiClient({ shop, locale });
    const store = await StoreApi({ api, locale });

    const methods = store.payment?.methods.map((i) => i.toLowerCase()) || [];
    const wallets = store.payment?.wallets.map((i) => i.toLowerCase()) || [];
    const items = [...methods, ...wallets];

    if (!items.length) {
        return null;
    }

    return (
        <div {...props} className={cn(className, 'flex flex-wrap items-center justify-center gap-1')}>
            {methods.map((method) => (
                <Image
                    key={method}
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
                />
            ))}

            {wallets.map((method) => (
                <Image
                    key={method}
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
                />
            ))}
        </div>
    );
};

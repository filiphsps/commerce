import { cn } from '@/utils/tailwind';
import Image from 'next/image';

import type { StoreModel } from '@/models/StoreModel';
import type { HTMLProps } from 'react';

export type AcceptedPaymentMethodsProps = {
    store: StoreModel;
} & HTMLProps<HTMLDivElement>;
export const AcceptedPaymentMethods = ({ store, className, ...props }: AcceptedPaymentMethodsProps) => {
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
                />
            ))}
        </div>
    );
};

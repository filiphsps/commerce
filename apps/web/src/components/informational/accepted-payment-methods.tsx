import styles from '@/components/informational/accepted-payment-methods.module.scss';
import type { StoreModel } from '@/models/StoreModel';
import Image from 'next/image';
import type { HTMLProps } from 'react';

export type AcceptedPaymentMethodsProps = {
    store: StoreModel;
} & HTMLProps<HTMLDivElement>;
export const AcceptedPaymentMethods = ({ store, className, ...props }: AcceptedPaymentMethodsProps) => {
    const methods = store?.payment?.methods?.map((i) => i.toLowerCase());
    const wallets = store?.payment?.wallets?.map((i) => i.toLowerCase());

    if ((!methods || methods?.length <= 0) && (!wallets || wallets?.length <= 0)) return null;

    return (
        <div {...props} className={`${styles.container}${className ? ` ${className}` : ''}`}>
            {methods?.map((method) => (
                <Image
                    key={method}
                    className={styles.item}
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
            {wallets?.map((method) => (
                <Image
                    key={method}
                    className={styles.item}
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

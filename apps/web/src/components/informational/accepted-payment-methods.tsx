import styles from '@/components/informational/accepted-payment-methods.module.scss';
import type { StoreModel } from '@/models/StoreModel';
import Image from 'next/image';

export type AcceptedPaymentMethodsProps = {
    store: StoreModel;
};
export const AcceptedPaymentMethods = ({ store }: AcceptedPaymentMethodsProps) => {
    const methods = store?.payment?.methods?.map((i) => i.toLowerCase());
    const wallets = store?.payment?.wallets?.map((i) => i.toLowerCase());

    if ((!methods || methods?.length <= 0) && (!wallets || wallets?.length <= 0)) return null;

    return (
        <div className={styles.container}>
            {methods?.map((method) => (
                <Image
                    key={method}
                    className={styles.item}
                    src={`/assets/payments/${method}.svg`}
                    alt={method}
                    height={15}
                    width={35}
                    sizes="35px"
                    priority={false}
                    loading="lazy"
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
                    priority={false}
                    loading="lazy"
                />
            ))}
        </div>
    );
};

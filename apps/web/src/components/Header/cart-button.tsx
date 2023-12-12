'use client';

import styles from '@/components/Header/cart-button.module.scss';
import Link from '@/components/link';
import { usePrevious } from '@/hooks/usePrevious';
import ShoppingBagIcon from '@/static/assets/icons/lottie/shopping-bag-light.json';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { useCart } from '@shopify/hydrogen-react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';

const Lottie = dynamic(() => import('react-lottie-player'), { ssr: false });

/* c8 ignore start */
export type CartButtonProps = {
    locale: Locale;
    i18n: LocaleDictionary;
};
export const CartButton = ({ locale }: CartButtonProps) => {
    const lottieRef = useRef<any>(null);

    const { totalQuantity, status } = useCart();
    const prevStatus = usePrevious(status);

    const pathName = usePathname();
    const prevPathName = usePrevious(pathName);

    /*const [state, setState] = useState('in-shopping-bag');
    const [direction, setDirection] = useState<1 | -1>(1);

    useEffect(() => {
        if (!playerRef.current) return;

        if (status === 'idle' && prevStatus !== 'idle') {
            // We just transitioned from a non-idle state to idle.
            setState('in-shopping-bag');
        }
    }, [status, prevStatus, playerRef]);

    useEffect(() => {
        if (!playerRef.current) return;

        if (pathName.includes('/cart')) {
            setDirection(1);
            setState('morph-shopping-bag-open');
        } else if (prevPathName?.includes('/cart')) {
            setDirection(-1);
            setState('morph-shopping-bag-open');
        } else {
            setDirection(1);
            setState('hover-shopping-bag-1');
        }
    }, [pathName, playerRef]);

    useEffect(() => {
        playerRef.current?.play();
    }, [state, direction]);*/

    // TODO: i18n.
    return (
        <Link
            href="/cart/"
            locale={locale}
            className={`${styles.container}`}
            data-items={totalQuantity || 0}
            title="View your shopping cart"
        >
            <div className={styles.quantity}>{totalQuantity ? totalQuantity : null}</div>
            <Lottie
                className={styles.icon}
                ref={lottieRef}
                animationData={ShoppingBagIcon}
                play={true}
                loop={false}
                useSubframes={true}
            />
        </Link>
    );
};
/* c8 ignore stop */

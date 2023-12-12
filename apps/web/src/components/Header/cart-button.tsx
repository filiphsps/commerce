'use client';

import styles from '@/components/Header/cart-button.module.scss';
import Link from '@/components/link';
import type { Locale, LocaleDictionary } from '@/utils/locale';
//import { Player } from '@lordicon/react';
import { useCart } from '@shopify/hydrogen-react';
import { usePathname } from 'next/navigation';

/* c8 ignore start */
export type CartButtonProps = {
    locale: Locale;
    i18n: LocaleDictionary;
};
export const CartButton = ({ locale }: CartButtonProps) => {
    //const playerRef = useRef<Player>(null);

    const { totalQuantity, status } = useCart();
    //const prevStatus = usePrevious(status);

    const pathName = usePathname();
    //const prevPathName = usePrevious(pathName);

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
            {/*<Player
                ref={playerRef}
                icon={ShoppingBagIcon}
                state={state}
                direction={direction}
                colorize="inherit"
                size={24}
            />*/}
        </Link>
    );
};
/* c8 ignore stop */

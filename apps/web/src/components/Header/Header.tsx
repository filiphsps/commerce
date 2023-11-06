import { FiSearch, FiShoppingBag } from 'react-icons/fi';

import { CurrentLocaleFlag } from '@/components/layout/CurrentLocaleFlag';
import type { FunctionComponent } from 'react';
import { HamburgerMenu } from '@/components/Header/hamburger-menu';
import { HeaderContainer } from '@/components/Header/header-container';
import { HeaderNavigation } from '@/components/Header/header-navigation';
import Image from 'next/image';
import Link from '@/components/link';
import { Pluralize } from '@/utils/pluralize';
import type { StoreModel } from '@/models/StoreModel';
import styles from '@/components/Header/header.module.scss';
import { useCart } from '@shopify/hydrogen-react';

interface HeaderProps {
    store?: StoreModel;
    navigation?: any;
    sidebarToggle?: any;
    sidebarOpen?: boolean;
}
const HeaderComponent: FunctionComponent<HeaderProps> = ({ store, navigation, sidebarToggle, sidebarOpen }) => {
    const cart = useCart();

    return (
        <HeaderContainer>
            <HamburgerMenu onClick={() => sidebarToggle?.()} open={sidebarOpen} />

            <div className={styles.logo}>
                <Link href={'/'} prefetch={false}>
                    <Image
                        src={store?.logo?.src!}
                        width={250}
                        height={150}
                        alt={`Store logo`}
                        priority={true}
                        sizes="(max-width: 1150px) 75px, 200px"
                    />
                </Link>
            </div>

            <HeaderNavigation menu={navigation} />

            <div className={styles.actions}>
                <div className={styles.action}>
                    <Link
                        href={'/search/'}
                        className="Wrapper"
                        title="Search for products, collections and pages across the whole store"
                        prefetch={false}
                    >
                        <FiSearch />
                    </Link>
                </div>
                <div className={styles.action}>
                    <Link title="Language and Region settings" href="/countries/" prefetch={false}>
                        <CurrentLocaleFlag />
                    </Link>
                </div>
                <div className={`${styles.action} ${((cart?.totalQuantity || 0) > 0 && styles.active) || ''}`}>
                    <Link
                        href={'/cart/'}
                        className="Wrapper"
                        title={`There are ${cart?.totalQuantity || 0} ${Pluralize({
                            count: cart?.totalQuantity || 0,
                            noun: 'item'
                        })} in your cart`}
                        prefetch={false}
                    >
                        {!!cart?.totalQuantity && <div className={styles['cart-indicator']}>{cart?.totalQuantity}</div>}
                        <FiShoppingBag />
                    </Link>
                </div>
            </div>
        </HeaderContainer>
    );
};

export default HeaderComponent;

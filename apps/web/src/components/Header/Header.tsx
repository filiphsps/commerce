import { TbSearch, TbShoppingBag } from 'react-icons/tb';

import { HamburgerMenu } from '@/components/Header/hamburger-menu';
import { HeaderContainer } from '@/components/Header/header-container';
import { HeaderNavigation } from '@/components/Header/header-navigation';
import styles from '@/components/Header/header.module.scss';
import Link from '@/components/link';
import type { StoreModel } from '@/models/StoreModel';
import type { Locale } from '@/utils/locale';
import Image from 'next/image';
import type { FunctionComponent } from 'react';

interface HeaderProps {
    store?: StoreModel;
    navigation?: any;
    locale: Locale;
}
const HeaderComponent: FunctionComponent<HeaderProps> = ({ store, navigation, locale }) => {
    //onClick={() => sidebarToggle?.()}
    return (
        <HeaderContainer>
            <HamburgerMenu />

            <div className={styles.logo}>
                <Link href={'/'} prefetch={false}>
                    <Image
                        src={store?.logo?.src!}
                        width={250}
                        height={150}
                        alt={`Store logo`}
                        priority
                        sizes="(max-width: 1150px) 75px, 200px"
                    />
                </Link>
            </div>

            <HeaderNavigation menu={navigation} locale={locale} />

            <div className={styles.actions}>
                <div className={styles.action}>
                    <Link
                        href={'/search/'}
                        className="Wrapper"
                        title="Search for products, collections and pages across the whole store"
                        prefetch={false}
                    >
                        <TbSearch />
                    </Link>
                </div>
                <div className={`${styles.action} ${(0 > 0 && styles.active) || ''}`}>
                    <Link
                        title="View your shopping cart" // TODO: i18n.
                        href={'/cart/'}
                        prefetch={false}
                    >
                        <TbShoppingBag />
                    </Link>
                </div>
            </div>
        </HeaderContainer>
    );
};

export default HeaderComponent;

import { FiSearch, FiShoppingBag } from 'react-icons/fi';

import { HamburgerMenu } from '@/components/Header/hamburger-menu';
import { HeaderContainer } from '@/components/Header/header-container';
import { HeaderNavigation } from '@/components/Header/header-navigation';
import styles from '@/components/Header/header.module.scss';
import { CurrentLocaleFlag } from '@/components/layout/CurrentLocaleFlag';
import Link from '@/components/link';
import type { StoreModel } from '@/models/StoreModel';
import type { Locale } from '@/utils/locale';
import Image from 'next/image';
import type { FunctionComponent } from 'react';

interface HeaderProps {
    store?: StoreModel;
    navigation?: any;
    sidebarToggle?: any;
    sidebarOpen?: boolean;
    locale: Locale;
}
const HeaderComponent: FunctionComponent<HeaderProps> = ({
    store,
    navigation,
    /*sidebarToggle,*/ sidebarOpen,
    locale
}) => {
    //onClick={() => sidebarToggle?.()}
    return (
        <HeaderContainer>
            <HamburgerMenu open={sidebarOpen} />

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

            <HeaderNavigation menu={navigation} locale={locale} />

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
                <div className={`${styles.action} ${(0 > 0 && styles.active) || ''}`}>
                    <Link href={'/cart/'} prefetch={false}>
                        <FiShoppingBag />
                    </Link>
                </div>
            </div>
        </HeaderContainer>
    );
};

export default HeaderComponent;

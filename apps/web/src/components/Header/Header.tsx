import { TbSearch } from 'react-icons/tb';

import type { Shop } from '@/api/shop';
import { HamburgerMenu } from '@/components/Header/hamburger-menu';
import { HeaderContainer } from '@/components/Header/header-container';
import { HeaderNavigation } from '@/components/Header/header-navigation';
import styles from '@/components/Header/header.module.scss';
import { MobileMenu } from '@/components/HeaderNavigation/mobile-menu';
import Link from '@/components/link';
import type { StoreModel } from '@/models/StoreModel';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import Image from 'next/image';
import type { HTMLProps } from 'react';
import { CartButton } from './cart-button';

type HeaderProps = {
    shop?: Shop;
    store: StoreModel;
    navigation: any;
    locale: Locale;
    i18n: LocaleDictionary;
} & HTMLProps<HTMLDivElement>;
const HeaderComponent = ({ shop, store, navigation, locale, i18n, className, ...props }: HeaderProps) => {
    const logo =
        shop?.configuration?.design?.branding?.logos?.primary || store?.logos?.alternative || store?.logos?.primary;

    const searchEnabled = false;

    return (
        <section className={`${styles.wrapper} ${className || ''}`}>
            <HeaderContainer {...props}>
                <HamburgerMenu />

                <div className={styles.logo}>
                    <Link href={'/'}>
                        {logo?.src ? (
                            <Image
                                src={logo.src}
                                width={175}
                                height={50}
                                alt={logo.alt || `Store logo`}
                                sizes="(max-width: 1024px) 165px, 175px"
                                loading="eager"
                                priority={true}
                            />
                        ) : null}
                    </Link>
                </div>

                <HeaderNavigation menu={navigation} locale={locale} />

                <div className={styles.actions}>
                    {searchEnabled ? (
                        <div className={styles.action}>
                            <Link
                                href={'/search/'}
                                title="Search for products, collections and pages across the whole store"
                            >
                                <TbSearch />
                            </Link>
                        </div>
                    ) : null}

                    <CartButton locale={locale} i18n={i18n} />
                </div>
            </HeaderContainer>
            <MobileMenu navigation={navigation} />
        </section>
    );
};

export default HeaderComponent;

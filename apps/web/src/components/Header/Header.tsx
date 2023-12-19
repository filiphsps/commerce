import 'server-only';

import { NavigationApi } from '@/api/navigation';
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
import { Suspense, type HTMLProps } from 'react';
import { CartButton } from './cart-button';

export type HeaderProps = {
    shop: Shop;
    locale: Locale;
    i18n: LocaleDictionary;

    /** @deprecated */
    store: StoreModel;
} & Omit<HTMLProps<HTMLDivElement>, 'className'>;
const HeaderComponent = async ({ shop, store, locale, i18n, ...props }: HeaderProps) => {
    const navigation = await NavigationApi({ shop, locale });

    const logo =
        shop?.configuration?.design?.branding?.logos?.primary || store?.logos?.alternative || store?.logos?.primary;

    return (
        <section className={styles.wrapper}>
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

                <div className={styles.actions} suppressHydrationWarning={true}>
                    <Suspense>
                        <CartButton locale={locale} i18n={i18n} />
                    </Suspense>
                </div>
            </HeaderContainer>

            <MobileMenu navigation={navigation} />
        </section>
    );
};

HeaderComponent.skeleton = () => (
    <section className={styles.wrapper}>
        <header className={styles.container}>
            <div className={styles.content}>
                <div className={styles.logo} />
            </div>
        </header>
    </section>
);

HeaderComponent.displayName = 'Nordcom.Header';
export default HeaderComponent;

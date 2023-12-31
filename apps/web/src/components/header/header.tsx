import 'server-only';

import { NavigationApi } from '@/api/navigation';
import type { Shop } from '@/api/shop';
import { CartButton } from '@/components/header/cart-button';
import { HamburgerMenu } from '@/components/header/hamburger-menu';
import { HeaderContainer } from '@/components/header/header-container';
import { HeaderNavigation } from '@/components/header/header-navigation';
import headerNavigationStyles from '@/components/header/header-navigation.module.scss';
import styles from '@/components/header/header.module.scss';
import { MobileMenu } from '@/components/HeaderNavigation/mobile-menu';
import Link from '@/components/link';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import Image from 'next/image';
import type { HTMLProps } from 'react';

export type HeaderProps = {
    shop: Shop;
    locale: Locale;
    i18n: LocaleDictionary;
} & Omit<HTMLProps<HTMLDivElement>, 'className'>;
const HeaderComponent = async ({ shop, locale, i18n, ...props }: HeaderProps) => {
    const navigation = await NavigationApi({ shop, locale });
    const headerTheme = shop?.theme?.header;

    const logo = shop?.logos?.primary!;
    return (
        <section
            className={styles.wrapper}
            data-theme={headerTheme?.theme || 'primary'}
            data-theme-variant={headerTheme?.themeVariant || 'default'}
        >
            <HeaderContainer {...props}>
                <HamburgerMenu />

                <Link href={'/'} className={styles.logo}>
                    {logo?.src ? (
                        <Image
                            src={logo.src}
                            width={175}
                            height={50}
                            alt={logo?.alt || `${shop.name}'s logo`}
                            sizes="(max-width: 1024px) 125px, 175px"
                            draggable={false}
                            priority={true}
                            loading="eager"
                            decoding="async"
                        />
                    ) : null}
                </Link>

                <HeaderNavigation menu={navigation} locale={locale} />

                <div className={styles.actions}>
                    <CartButton locale={locale} i18n={i18n} />
                </div>
            </HeaderContainer>

            <MobileMenu navigation={navigation} />
        </section>
    );
};

HeaderComponent.skeleton = () => (
    <section className={styles.wrapper} data-skeleton>
        <header className={styles.container}>
            <div className={styles.content}>
                <div className={styles.logo} />

                <nav className={headerNavigationStyles.container} />
                <div className={styles.actions} />
            </div>
        </header>
    </section>
);

HeaderComponent.displayName = 'Nordcom.Header';
export default HeaderComponent;

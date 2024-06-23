import 'server-only';

import styles from '@/components/header/header.module.scss';
import headerNavigationStyles from '@/components/header/header-navigation.module.scss';

import { type HTMLProps, Suspense } from 'react';
import Image from 'next/image';

import { Shop } from '@nordcom/commerce-db';

import { NavigationApi } from '@/api/navigation';

import { CartButton } from '@/components/header/cart-button';
import { HamburgerMenu } from '@/components/header/hamburger-menu';
import { HeaderContainer } from '@/components/header/header-container';
import { HeaderNavigation } from '@/components/header/header-navigation';
import Link from '@/components/link';

import type { Locale, LocaleDictionary } from '@/utils/locale';

export type HeaderProps = {
    domain: string;
    locale: Locale;
    i18n: LocaleDictionary;
} & Omit<HTMLProps<HTMLDivElement>, 'className'>;
const HeaderComponent = async ({ domain, locale, i18n, ...props }: HeaderProps) => {
    const shop = await Shop.findByDomain(domain);
    const navigation = await NavigationApi({ shop, locale });

    const {
        logo,
        theme: { ...headerTheme }
    } = shop.design.header;

    return (
        <section
            className={styles.wrapper}
            data-theme={headerTheme.accent || 'primary'}
            data-theme-variant={headerTheme.variant || 'default'}
        >
            <HeaderContainer {...props}>
                <Suspense fallback={<div />}>
                    <HamburgerMenu />
                </Suspense>

                <Link href={'/'} className={styles.logo}>
                    {logo.src ? (
                        <Image
                            src={logo.src}
                            width={175}
                            height={50}
                            alt={logo.alt || `${shop.name}'s logo`}
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

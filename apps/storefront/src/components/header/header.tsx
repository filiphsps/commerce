import 'server-only';

import { type HTMLProps, Suspense } from 'react';
import { HiOutlineSearch } from 'react-icons/hi';

import { Shop } from '@nordcom/commerce-db';

import { MenuApi } from '@/api/navigation';
import { type Locale, type LocaleDictionary, useTranslation } from '@/utils/locale';
import Image from 'next/image';

import { CartButton } from '@/components/header/cart-button';
import { HeaderMenu } from '@/components/header/header-menu';
import { HeaderNavigation } from '@/components/header/header-navigation';
import Link from '@/components/link';

export type HeaderProps = {
    domain: string;
    locale: Locale;
    i18n: LocaleDictionary;
} & Omit<HTMLProps<HTMLDivElement>, 'className'>;
const HeaderComponent = async ({ domain, locale, i18n, ...props }: HeaderProps) => {
    const shop = await Shop.findByDomain(domain);

    const menu = await MenuApi({ shop, locale });
    const slices = menu.slices;
    const { logo } = shop.design.header;

    const { t } = useTranslation('common', i18n);

    return (
        <section
            className="sticky top-0 z-50 flex w-full flex-col items-center overscroll-contain shadow-none transition-shadow duration-150 group-data-[menu-open=true]/body:shadow-lg group-data-[scrolled=true]/body:shadow-lg md:max-h-[95dvh]"
            {...props}
        >
            <section className="flex h-16 w-full flex-col items-center bg-white">
                <header className="flex h-full w-full max-w-[var(--page-width)] items-center justify-start gap-4 overflow-hidden px-2 md:px-3">
                    <Link href={'/'} className="block h-full py-[0.75rem]">
                        {logo.src ? (
                            <Image
                                className="h-full object-contain object-left"
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

                    <div className="flex h-full grow items-center justify-end gap-4 lg:gap-6" data-nosnippet={true}>
                        <Link href="/search/" className="hover:text-primary transition-colors" title={t('search')}>
                            <HiOutlineSearch className="text-xl lg:text-2xl" style={{ strokeWidth: 2.5 }} />
                        </Link>

                        <CartButton i18n={i18n} locale={locale} />
                    </div>
                </header>
            </section>

            <section className="flex w-full flex-col items-center justify-center gap-0 border-0 border-b border-t border-solid border-gray-300 bg-white text-black group-data-[menu-open=true]/body:border-b-gray-100">
                <Suspense>
                    <HeaderNavigation slices={slices} />
                </Suspense>
            </section>

            <Suspense fallback={<div className="h-0 w-full border-0" />}>
                <HeaderMenu slices={slices} />
            </Suspense>
        </section>
    );
};

// TODO: Skeleton.
HeaderComponent.skeleton = () => (
    <section
        className="sticky top-0 z-50 flex flex-col items-center shadow-none group-data-[scrolled=true]/body:shadow-lg"
        data-skeleton
    >
        <section className="h-16"></section>
        <section className="h-16"></section>
    </section>
);

HeaderComponent.displayName = 'Nordcom.Header';
export default HeaderComponent;

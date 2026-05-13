import 'server-only';

import { Shop } from '@nordcom/commerce-db';
import { Search as SearchIcon } from 'lucide-react';
import Image from 'next/image';
import { type HTMLProps, Suspense } from 'react';
import { CartButton } from '@/components/header/cart-button';
import Link from '@/components/link';
import { getTranslations, type Locale, type LocaleDictionary } from '@/utils/locale';

import { HeaderAccountSection } from './header-account-section';

export type HeaderProps = {
    domain: string;
    locale: Locale;
    i18n: LocaleDictionary;
} & Omit<HTMLProps<HTMLDivElement>, 'className'>;

const HeaderComponent = async ({ domain, locale, i18n, ...props }: HeaderProps) => {
    const shop = await Shop.findByDomain(domain, { sensitiveData: true });

    const { logo } = shop.design.header;
    const { t } = getTranslations('common', i18n);

    return (
        <section
            className="sticky top-0 z-20 flex w-full flex-col items-center overscroll-contain shadow-none transition-shadow duration-150 [grid-area:header] group-data-[menu-open=true]/body:shadow-lg group-data-[scrolled=true]/body:shadow-lg md:max-h-[95dvh]"
            {...props}
        >
            <section className="flex h-16 w-full flex-col items-center bg-white">
                <header className="flex h-full w-full max-w-[var(--page-width)] items-center justify-start gap-4 overflow-hidden px-2 md:px-3">
                    <div className="flex h-16 py-1">
                        <Link
                            href={'/'}
                            style={{
                                aspectRatio: `${(logo.width / logo.height).toFixed(2)} / 1`,
                            }}
                            className="-ml-2 block h-full rounded-lg px-2 py-2 hover:bg-gray-100 focus-visible::bg-gray-100"
                        >
                            {logo.src ? (
                                <Image
                                    className="h-full w-full object-contain object-left"
                                    src={logo.src}
                                    width={logo.width || 125}
                                    height={logo.height || 50}
                                    alt={logo.alt || `${shop.name}'s logo`}
                                    sizes="(max-width: 1024px) 125px, 175px"
                                    draggable={false}
                                    priority={true}
                                    loading="eager"
                                    decoding="async"
                                />
                            ) : null}
                        </Link>
                    </div>

                    <div className="flex h-full grow items-center justify-end gap-6" data-nosnippet={true}>
                        <Link
                            href="/search/"
                            className="transition-colors hover:text-primary focus-visible:text-primary"
                            title={t('search')}
                        >
                            <SearchIcon className="stroke-1 text-xl lg:text-2xl" />
                        </Link>

                        <Suspense fallback={<HeaderAccountSection.skeleton />}>
                            <HeaderAccountSection shop={shop} locale={locale} i18n={i18n} />
                        </Suspense>

                        <CartButton i18n={i18n} locale={locale} />
                    </div>
                </header>
            </section>
        </section>
    );
};

HeaderComponent.skeleton = () => (
    <section className="sticky top-0 z-50 flex w-full flex-col items-center overscroll-contain shadow-none transition-shadow duration-150 [grid-area:header] group-data-[scrolled=true]/body:shadow-lg md:max-h-[95dvh]">
        <section className="flex h-16 w-full flex-col items-center bg-white">
            <header className="overflow-x-shadow flex h-full w-full max-w-[var(--page-width)] items-center justify-start gap-4 px-2 md:px-3">
                <Link href={'/'} className="h-full w-32 py-2">
                    <div className="h-full w-full rounded-lg" data-skeleton />
                </Link>

                <div className="flex h-full grow items-center justify-end gap-4 py-3 lg:gap-6">
                    <div className="aspect-square h-[calc(100%-0.5rem)] rounded-full" data-skeleton />
                    <div className="aspect-square h-full w-20 rounded-3xl" data-skeleton />
                </div>
            </header>
        </section>
    </section>
);

HeaderComponent.displayName = 'Nordcom.Header';
export default HeaderComponent;

import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import Image from 'next/image';
import { Suspense } from 'react';
import { FooterApi } from '@/api/footer';

import FooterContent from '@/components/footer/footer-content';

import type { Locale, LocaleDictionary } from '@/utils/locale';

const BLOCK_STYLES = 'flex-grow w-full h-full flex-col auto-rows-auto gap-3 flex empty:hidden md:empty:flex';

export type FooterProps = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
};

const Footer = async ({ shop, locale, i18n }: FooterProps) => {
    const footer = await FooterApi({ shop, locale });
    if (!footer) {
        return null;
    }

    // TODO: This should be `design.footer`.
    const { logo } = shop.design.header;

    return (
        <footer className="flex h-full max-h-max w-full items-center justify-around self-end overflow-hidden bg-primary p-2 pt-8 text-primary-foreground [grid-area:footer] md:p-3 md:pt-6">
            <div className="flex h-full w-full max-w-[var(--page-width)] flex-col items-stretch gap-4 md:gap-8 2xl:px-3">
                <section className="grid h-full w-full grid-cols-1 items-start justify-between gap-6 pb-6 text-left md:flex lg:pb-12">
                    <div className={BLOCK_STYLES}>
                        {logo.src ? (
                            <Image
                                className="h-16 object-contain object-left brightness-100 grayscale invert"
                                title={shop.name}
                                src={logo.src}
                                alt={`${shop.name}'s Logo`}
                                width={logo.width}
                                height={logo.height}
                                sizes="(max-width: 950px) 75px, 225px"
                                priority={false}
                                loading="lazy"
                                decoding="async"
                                draggable={false}
                            />
                        ) : null}
                    </div>
                </section>

                <Suspense key="layout.footer.footer-content" fallback={<FooterContent.skeleton />}>
                    <FooterContent locale={locale} i18n={i18n} shop={shop} />
                </Suspense>
            </div>
        </footer>
    );
};

Footer.skeleton = () => (
    <footer className="flex h-full max-h-max w-full items-center justify-around self-end overflow-hidden bg-primary p-2 pt-8 text-primary-foreground [grid-area:footer] md:p-3 md:pt-6">
        <div className="flex h-full w-full max-w-[var(--page-width)] flex-col items-stretch gap-4 md:gap-8 2xl:px-3">
            <section className="grid h-full w-full grid-cols-1 items-start justify-between gap-6 pb-6 text-left md:flex lg:pb-12">
                <div className={BLOCK_STYLES}>
                    <div className="h-16 w-full overflow-hidden" data-skeleton></div>
                </div>
            </section>

            <FooterContent.skeleton />
        </div>
    </footer>
);

Footer.displayName = 'Nordcom.Footer';
export default Footer;

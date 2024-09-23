import 'server-only';

import { Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';

import { FooterApi } from '@/api/footer';
import Image from 'next/image';

import FooterContent from '@/components/footer/footer-content';
import Link from '@/components/link';
import { Content } from '@/components/typography/content';
import { PrismicText } from '@/components/typography/prismic-text';

import type { Locale, LocaleDictionary } from '@/utils/locale';

const BLOCK_STYLES = 'flex-grow w-full h-full flex-col auto-rows-auto gap-3 flex empty:hidden md:empty:flex';

export type FooterProps = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
};
const Footer = async ({ shop, locale, i18n }: FooterProps) => {
    const footer = await FooterApi({ shop, locale });

    // TODO: This should be `design.footer`.
    const { logo } = shop.design.header;

    // TODO: Dynamic copyright copy and content.
    return (
        <footer className="bg-primary text-primary-foreground flex h-full max-h-max w-full items-center justify-around self-end overflow-hidden p-2 pt-8 [grid-area:footer] md:p-3 md:pt-6">
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

                        <Content as="address" className="prose-sm prose-p:leading-snug font-medium not-italic">
                            <PrismicText data={footer.address} styled={false} />
                        </Content>

                        {footer.custom_html ? (
                            <div className="w-full" dangerouslySetInnerHTML={{ __html: footer.custom_html }} />
                        ) : null}
                    </div>

                    {footer.body.map(({ primary: { title }, items }, index) => {
                        return (
                            <div key={`${title}-${index}`} className={BLOCK_STYLES} data-align="right">
                                {title ? (
                                    <div className="text-lg font-extrabold leading-tight md:text-xl">{title}</div>
                                ) : null}

                                {items.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 *:after:font-extrabold *:after:opacity-75 *:after:content-[','] last:*:after:content-['.'] md:gap-y-1">
                                        {items
                                            .filter(({ title }) => title && title.length > 0)
                                            .map((item) => (
                                                <Link
                                                    key={`${item.handle}-${item.title}`}
                                                    href={item.handle || ''}
                                                    target={item.handle?.startsWith('http') ? '_blank' : ''}
                                                    className="text-base leading-none hover:underline focus-visible:underline md:text-sm"
                                                >
                                                    {item.title}
                                                </Link>
                                            ))}
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </section>

                <Suspense key="layout.footer.footer-content" fallback={<FooterContent.skeleton />}>
                    <FooterContent locale={locale} i18n={i18n} shop={shop} />
                </Suspense>
            </div>
        </footer>
    );
};

Footer.skeleton = () => (
    <footer className="text-primary-foreground bg-primary flex h-full max-h-max w-full items-center justify-around self-end overflow-hidden p-2 pt-8 [grid-area:footer] md:p-3 md:pt-6">
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

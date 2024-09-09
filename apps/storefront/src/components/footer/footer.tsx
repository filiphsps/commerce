import 'server-only';

import styles from '@/components/footer/footer.module.scss';

import type { OnlineShop } from '@nordcom/commerce-db';

import { FooterApi } from '@/api/footer';
import { cn } from '@/utils/tailwind';
import Image from 'next/image';

import FooterContent from '@/components/footer/footer-content';
import Link from '@/components/link';
import { PrismicText } from '@/components/typography/prismic-text';

import { Content } from '../typography/content';

import type { Locale, LocaleDictionary } from '@/utils/locale';

export type FooterProps = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
};
const Footer = async ({ shop, locale, i18n }: FooterProps) => {
    const footer = await FooterApi({ shop, locale });

    // TODO: This should be `design.footer`.
    const logo = shop.design.header.logo;

    const borderStyles = 'border-0 border-b-4 border-solid border-primary-dark pb-6 lg:border-0 lg:pb-0';

    // TODO: Dynamic copyright copy and content.
    return (
        <footer className="bg-primary text-primary-foreground flex h-full max-h-max w-full items-center justify-around self-end overflow-hidden p-2 pt-8 [grid-area:footer] md:p-3 md:pt-6">
            <div className={cn(styles.content, 'flex h-full flex-col items-stretch gap-4 md:gap-8 2xl:px-3')}>
                <div className={cn(styles.blocks, 'gap-6 pb-6 lg:pb-12', borderStyles)}>
                    <div className={cn(styles.block, borderStyles)}>
                        {logo.src ? (
                            <Image
                                className={styles.logo}
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

                        <Content as="address" className="prose-sm font-medium">
                            <PrismicText data={footer.address} styled={false} />
                        </Content>

                        {footer.custom_html ? (
                            <div className="w-full" dangerouslySetInnerHTML={{ __html: footer.custom_html }} />
                        ) : null}
                    </div>

                    {footer.body.map(({ primary: { title }, items }, index) => {
                        return (
                            <div
                                key={`${title}-${index}`}
                                className={cn(
                                    styles.block,
                                    'flex flex-col gap-2 empty:hidden md:items-end md:justify-end md:empty:flex'
                                )}
                                data-align="right"
                            >
                                {title ? (
                                    <div className={cn(styles.title, 'text-xl font-extrabold leading-tight')}>
                                        {title}
                                    </div>
                                ) : null}

                                {items.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 gap-y-3 *:after:font-extrabold *:after:opacity-75 *:after:content-[','] last:*:after:content-['.']">
                                        {items.map((item) => (
                                            <Link
                                                key={`${item.handle}-${item.title}`}
                                                href={item.handle || ''}
                                                target={item.handle?.startsWith('http') ? '_blank' : ''}
                                                className="text-sm leading-none hover:underline"
                                            >
                                                {item.title}
                                            </Link>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>

                <FooterContent locale={locale} i18n={i18n} shop={shop} />
            </div>
        </footer>
    );
};

Footer.skeleton = () => (
    <footer className={styles.container} data-skeleton>
        <div className={styles.content}>
            <div className={styles.blocks}>
                <div className={styles.block}>
                    <div className={styles.logo}></div>
                </div>
            </div>

            <div className={styles.legal}></div>
        </div>
    </footer>
);

Footer.displayName = 'Nordcom.Footer';
export default Footer;

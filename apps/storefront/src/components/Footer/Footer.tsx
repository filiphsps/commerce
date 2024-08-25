import 'server-only';

import styles from '@/components/Footer/footer.module.scss';

import type { OnlineShop } from '@nordcom/commerce-db';

import { FooterApi } from '@/api/footer';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { StoreApi } from '@/api/store';
import { cn } from '@/utils/tailwind';
import Image from 'next/image';

import FooterContent from '@/components/Footer/footer-content';
import Link from '@/components/link';
import { PrismicText } from '@/components/typography/prismic-text';

import type { Locale, LocaleDictionary } from '@/utils/locale';

export type FooterProps = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
};
const Footer = async ({ shop, locale, i18n }: FooterProps) => {
    const api = await ShopifyApolloApiClient({ shop, locale });

    try {
        const footer = await FooterApi({ shop, locale });
        const store = await StoreApi({ api, locale });

        const borderStyles = 'border-0 border-b-4 border-solid border-primary-light pb-8 lg:border-0 lg:pb-0';

        // TODO: Dynamic copyright copy and content.
        return (
            <footer className={cn(styles.container, 'flex h-full min-h-96 w-full pt-4 md:pt-8')}>
                <div className={cn(styles.content, 'flex h-full flex-col items-stretch gap-4 md:gap-8')}>
                    <div className={cn(styles.blocks, 'gap-6', borderStyles)}>
                        <div className={cn(styles.block, borderStyles)}>
                            {store.logos.primary?.src ? (
                                <Image
                                    className={styles.logo}
                                    title={store.name}
                                    src={store.logos.primary.src}
                                    alt={store.logos.primary.alt || store.name}
                                    width={store.logos.primary.width || 0}
                                    height={store.logos.primary.height || 0}
                                    sizes="(max-width: 950px) 75px, 225px"
                                    priority={false}
                                    loading="lazy"
                                    decoding="async"
                                    draggable={false}
                                />
                            ) : null}

                            <address className="text-sm font-medium leading-snug">
                                <PrismicText data={footer.address} styled={false} />
                            </address>
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
                                            {items.map((item: any, index) => (
                                                <Link
                                                    key={item.handle || index}
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
    } catch {
        // TODO: Handle error.
        return null;
    }
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

import 'server-only';

import styles from '@/components/Footer/footer.module.scss';

import Image from 'next/image';

import type { Shop } from '@nordcom/commerce-database';

import { FooterApi } from '@/api/footer';
import { ShopifyApiConfig, ShopifyApolloApiClient } from '@/api/shopify';
import { StoreApi } from '@/api/store';

import FooterContent from '@/components/Footer/footer-content';
import Link from '@/components/link';
import { PrismicText } from '@/components/typography/prismic-text';

import type { Locale, LocaleDictionary } from '@/utils/locale';

export type FooterProps = {
    shop: Shop;
    locale: Locale;
    i18n: LocaleDictionary;
};
const Footer = async ({ shop, locale, i18n }: FooterProps) => {
    const apiConfig = await ShopifyApiConfig({ shop });
    const api = await ShopifyApolloApiClient({ shop, locale, apiConfig });

    const footer = await FooterApi({ shop, locale });
    const store = await StoreApi({ api, locale });

    // TODO: Dynamic copyright copy and content.
    return (
        <footer className={styles.container}>
            <div className={styles.content}>
                <div className={styles.blocks}>
                    <div className={styles.block}>
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
                            />
                        ) : null}

                        <PrismicText data={footer.address} />
                    </div>

                    {footer.blocks.map((block, index) => (
                        <div key={`${block.title}-${index}`} className={styles.block} data-align="right">
                            <div className={styles.title}>{block.title}</div>

                            {block?.items.map((item: any) => (
                                <Link
                                    key={item.handle}
                                    href={item.handle || ''}
                                    target={item.handle?.startsWith('http') ? '_blank' : ''}
                                >
                                    {item.title}
                                </Link>
                            ))}
                        </div>
                    ))}
                </div>

                <FooterContent locale={locale} i18n={i18n} store={store} />
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

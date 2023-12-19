import 'server-only';

import { FooterApi } from '@/api/footer';
import type { Shop } from '@/api/shop';
import type { StoreModel } from '@/models/StoreModel';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from '../link';
import { PrismicText } from '../typography/prismic-text';
import styles from './footer.module.scss';

const FooterContent = dynamic(() => import('@/components/Footer/footer-content'));

export type FooterProps = {
    shop: Shop;
    locale: Locale;
    i18n: LocaleDictionary;

    /** @deprecated */
    store: StoreModel;
};
const Footer = async ({ store, shop, locale, i18n }: FooterProps) => {
    const footer = await FooterApi({ shop, locale });

    // TODO: Dynamic copyright copy and content.
    return (
        <footer className={styles.container}>
            <div className={styles.content}>
                <div className={styles.blocks}>
                    <div className={styles.block}>
                        <div className={styles.logo}>
                            {store.logos?.primary?.src && (
                                <Image
                                    src={store.logos.primary.src}
                                    alt={store.logos.primary.alt || 'Logo'}
                                    fill
                                    sizes="(max-width: 950px) 75px, 225px"
                                />
                            )}
                        </div>

                        <PrismicText data={footer.address} />
                    </div>

                    {footer.blocks?.map?.((block) => (
                        <div key={block.title} className={styles.block} data-align="right">
                            <div className={styles.title}>{block.title}</div>
                            {block?.items.map((item: any) => (
                                <Link
                                    key={item.handle}
                                    href={item.handle || ''}
                                    target={item.handle.startsWith('http') ? '_blank' : ''}
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
    <footer className={styles.container}>
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

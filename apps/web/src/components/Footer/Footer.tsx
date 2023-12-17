import { FooterContent } from '@/components/Footer/footer-content';
import type { FooterModel } from '@/models/FooterModel';
import type { StoreModel } from '@/models/StoreModel';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import Image from 'next/image';
import type { FunctionComponent } from 'react';
import Link from '../link';
import { PrismicText } from '../typography/prismic-text';
import styles from './footer.module.scss';

interface FooterProps {
    store: StoreModel;
    data: FooterModel;
    locale: Locale;
    i18n: LocaleDictionary;
}
const Footer: FunctionComponent<FooterProps> = ({ store, data: footer, locale, i18n }) => {
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

export default Footer;

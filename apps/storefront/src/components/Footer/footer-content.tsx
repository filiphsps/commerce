import styles from '@/components/Footer/footer.module.scss';

import Image from 'next/image';
import { Suspense } from 'react';

import { useTranslation } from '@/utils/locale';

import { AcceptedPaymentMethods } from '@/components/informational/accepted-payment-methods';
import { CurrentLocaleFlag } from '@/components/informational/current-locale-flag';
import Link from '@/components/link';

import type { StoreModel } from '@/models/StoreModel';
import type { Locale, LocaleDictionary } from '@/utils/locale';

export type FooterContentProps = {
    locale: Locale;
    i18n: LocaleDictionary;
    store: StoreModel;
};
const FooterContent = ({ locale, i18n, store }: FooterContentProps) => {
    const { t } = useTranslation('common', i18n);

    // TODO: This should be tenant-specific.
    const copyright = <>&copy; 2023-{new Date().getFullYear()}</>;

    return (
        <>
            {/* TODO: This should be configurable in prismic. */}
            <div className={styles.legal}>
                <div className={styles['bottom-block']}>
                    <Suspense>
                        <AcceptedPaymentMethods store={store!} />
                    </Suspense>
                    <div className={styles['legal-and-copyrights']}>
                        <div className={styles.important}>
                            <Link className={styles.policy} href="/contact/">
                                Contact
                            </Link>
                            <Link
                                className={styles.policy}
                                href="https://nordcom.io/legal/terms-of-service/"
                                target="_blank"
                            >
                                Terms of Service
                            </Link>
                            <Link className={styles.policy} href="/privacy-policy/">
                                Privacy Policy
                            </Link>
                        </div>
                    </div>
                </div>

                <div className={styles['bottom-block']}>
                    <div className={styles.socials}>
                        {store.social.map((social) => (
                            <Link
                                className={`${styles.social} ${styles['social-icon']}`}
                                key={social.url}
                                href={social.url}
                            >
                                <Image
                                    src={`/assets/icons/social/${social.name.toLowerCase()}.svg`}
                                    width={35}
                                    height={35}
                                    alt={social.name}
                                    title={social.name}
                                    sizes="35px"
                                    draggable={false}
                                    decoding="async"
                                />
                            </Link>
                        ))}
                        <Link className={styles.flag} href="/countries/" title={t('language-and-region-settings')}>
                            <Suspense>
                                <CurrentLocaleFlag locale={locale} />
                            </Suspense>
                        </Link>
                    </div>
                    <div className={styles['legal-and-copyrights']}>
                        <div className={styles.copyright}>
                            {copyright}
                            <Link href={`https://nordcom.io/`} target="_blank">
                                Nordcom Group Inc.
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default FooterContent;

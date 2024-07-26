import styles from '@/components/Footer/footer.module.scss';

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
        /* TODO: This should be configurable in prismic. */
        <div className={styles.legal}>
            <div className={styles['bottom-block']}>
                <AcceptedPaymentMethods store={store!} />

                <div className={styles['legal-and-copyrights']}>
                    <div className="flex gap-4 *:text-sm *:font-black *:uppercase">
                        <Link href="/contact/">Contact</Link>
                        <Link href="https://nordcom.io/legal/terms-of-service/" target="_blank">
                            Terms of Service
                        </Link>
                        <Link href="/privacy-policy/">Privacy Policy</Link>
                    </div>
                </div>
            </div>

            <div className={styles['bottom-block']}>
                <Link className="block h-8" href="/countries/" title={t('language-and-region-settings')}>
                    <CurrentLocaleFlag locale={locale} />
                </Link>

                <div className="flex gap-2 text-sm font-black uppercase">
                    {copyright}
                    <Link href={`https://nordcom.io/`} target="_blank">
                        Nordcom AB
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default FooterContent;

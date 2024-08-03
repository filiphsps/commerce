import styles from '@/components/Footer/footer.module.scss';

import { useTranslation } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

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
        <div className={cn(styles.legal, 'h-full w-full gap-8 pt-6 md:gap-4 lg:pt-12')}>
            <div className="flex flex-col items-center justify-end gap-2 md:items-start">
                <AcceptedPaymentMethods store={store!} />

                <div className={styles['legal-and-copyrights']}>
                    <div className="flex flex-wrap gap-4 gap-y-0 *:text-xs *:font-black *:uppercase *:lg:text-sm">
                        <Link href="/contact/">Contact</Link>
                        <Link href="https://nordcom.io/legal/terms-of-service/" target="_blank">
                            Terms of Service
                        </Link>
                        <Link href="/privacy-policy/">Privacy Policy</Link>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-center justify-end gap-2 md:items-end">
                <Link className="block h-8" href="/countries/" title={t('language-and-region-settings')}>
                    <CurrentLocaleFlag locale={locale} />
                </Link>

                <div className="flex gap-2 text-xs font-black uppercase lg:text-sm">
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

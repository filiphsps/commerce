import type { FooterModel } from '@/models/FooterModel';
import type { StoreModel } from '@/models/StoreModel';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import type { FunctionComponent } from 'react';

import styles from './footer.module.scss';
import { FooterContent } from '@/components/Footer/footer-content';

interface FooterProps {
    store: StoreModel;
    data: FooterModel;
    locale: Locale;
    i18n: LocaleDictionary;
}
const Footer: FunctionComponent<FooterProps> = ({ store, data, locale, i18n }) => {
    // TODO: Dynamic copyright copy and content.
    return (
        <footer className={styles.container}>
            <div className={styles.content}>
                <FooterContent locale={locale} i18n={i18n} store={store} data={data} />
            </div>
        </footer>
    );
};

export default Footer;

import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import { Suspense } from 'react';
import { AcceptedPaymentMethods } from '@/components/informational/accepted-payment-methods';
import { CurrentLocaleFlag } from '@/components/informational/current-locale-flag';
import Link from '@/components/link';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { capitalize, getTranslations } from '@/utils/locale';

export type FooterContentProps = {
    locale: Locale;
    i18n: LocaleDictionary;
    shop: OnlineShop;
};

const FooterContent = async ({ locale, i18n, shop }: FooterContentProps) => {
    const { t } = getTranslations('common', i18n);

    return (
        <section className="grid h-full w-full grid-cols-1 gap-8 overflow-hidden md:grid-cols-2 md:gap-4">
            <div className="flex flex-col items-center justify-end gap-2 md:items-start">
                <Suspense>
                    <AcceptedPaymentMethods shop={shop} locale={locale} />
                </Suspense>
            </div>

            <div className="flex flex-col items-center justify-end gap-2 md:items-end">
                <Link className="block h-8" href="/countries/" title={capitalize(t('language-and-region-settings'))}>
                    <CurrentLocaleFlag locale={locale} />
                </Link>
            </div>
        </section>
    );
};

FooterContent.skeleton = () => (
    <section className="grid h-full w-full grid-cols-1 gap-8 overflow-hidden md:grid-cols-2 md:gap-4">
        <div className="flex flex-col items-center justify-end gap-2 md:items-start">
            <div className="h-8 w-64 max-w-full overflow-hidden" data-skeleton />
        </div>
        <div className="flex h-full flex-col items-center justify-end gap-2 md:items-end">
            <div className="aspect-[3/2] h-8 max-w-full overflow-hidden" data-skeleton />

            <div className="h-8 w-44 max-w-full overflow-hidden" data-skeleton />
        </div>
    </section>
);

FooterContent.displayName = 'Nordcom.Footer.Content';
export default FooterContent;

import 'server-only';

import styles from '@/components/Footer/footer.module.scss';

import { Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';

import { FooterApi } from '@/api/footer';
import { useTranslation } from '@/utils/locale';
import { linkResolver } from '@/utils/prismic';
import { cn } from '@/utils/tailwind';
import { asLink, asText } from '@prismicio/client';

import { AcceptedPaymentMethods } from '@/components/informational/accepted-payment-methods';
import { CurrentLocaleFlag } from '@/components/informational/current-locale-flag';
import Link from '@/components/link';

import { PrismicText } from '../typography/prismic-text';

import type { Locale, LocaleDictionary } from '@/utils/locale';

export type FooterContentProps = {
    locale: Locale;
    i18n: LocaleDictionary;
    shop: OnlineShop;
};
const FooterContent = async ({ locale, i18n, shop }: FooterContentProps) => {
    const footer = await FooterApi({ shop, locale });

    const { t } = useTranslation('common', i18n);

    const hasCopyrights = asText(footer.copyrights).trim().length > 0;

    return (
        /* TODO: This should be configurable in prismic. */
        <div className={cn(styles.legal, 'h-full w-full gap-8 pt-6 md:gap-4 lg:pt-12')}>
            <div className="flex flex-col items-center justify-end gap-2 md:items-start">
                <Suspense fallback={null}>
                    <AcceptedPaymentMethods shop={shop} locale={locale} />
                </Suspense>

                {footer.policy_links.length > 0 ? (
                    <div className={styles['legal-and-copyrights']}>
                        <div className="flex flex-wrap justify-center gap-4 gap-y-1 *:text-xs *:font-black *:uppercase lg:justify-start *:lg:text-sm">
                            {footer.policy_links.map(({ title, href: link }, index) => {
                                const href = asLink(link, { linkResolver });
                                const target: undefined | '_blank' = (href as any).target || undefined;

                                return (
                                    <Link
                                        href={href}
                                        key={`${target}-${index}`}
                                        target={target}
                                        className="hover:underline"
                                    >
                                        {title}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ) : null}
            </div>

            <div className="flex flex-col items-center justify-end gap-2 md:items-end">
                <Link className="block h-8" href="/countries/" title={t('language-and-region-settings')}>
                    <CurrentLocaleFlag locale={locale} />
                </Link>

                {hasCopyrights ? (
                    <div className="flex gap-2 text-xs font-black uppercase lg:text-sm">
                        <PrismicText data={footer.copyrights} styled={false} />
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default FooterContent;

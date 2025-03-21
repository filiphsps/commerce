import 'server-only';

import { Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';

import { FooterApi } from '@/api/footer';
import { capitalize, getTranslations } from '@/utils/locale';
import { linkResolver } from '@/utils/prismic';
import { asLink, asText } from '@prismicio/client';

import { AcceptedPaymentMethods } from '@/components/informational/accepted-payment-methods';
import { CurrentLocaleFlag } from '@/components/informational/current-locale-flag';
import Link from '@/components/link';
import { PrismicText } from '@/components/typography/prismic-text';

import type { Locale, LocaleDictionary } from '@/utils/locale';

export type FooterContentProps = {
    locale: Locale;
    i18n: LocaleDictionary;
    shop: OnlineShop;
};
const FooterContent = async ({ locale, i18n, shop }: FooterContentProps) => {
    const footer = await FooterApi({ shop, locale });

    const { t } = getTranslations('common', i18n);

    const hasCopyrights = asText(footer.copyrights).trim().length > 0;

    return (
        <section className="grid h-full w-full grid-cols-1 gap-8 overflow-hidden md:grid-cols-2 md:gap-4">
            <div className="flex flex-col items-center justify-end gap-2 md:items-start">
                <Suspense>
                    <AcceptedPaymentMethods shop={shop} locale={locale} />
                </Suspense>

                {footer.policy_links.length > 0 ? (
                    <div className="flex flex-wrap items-center justify-self-end md:items-end">
                        <div className="flex flex-wrap justify-center gap-4 gap-y-1 *:text-xs *:font-black *:uppercase lg:justify-start *:lg:text-sm">
                            {footer.policy_links.map(({ title, href: link }, index) => {
                                const href = asLink(link, { linkResolver });
                                const target: undefined | '_blank' = (href as any).target || undefined;

                                return (
                                    <Link
                                        href={href}
                                        key={`${target}-${index}`}
                                        target={target}
                                        className="whitespace-nowrap hover:brightness-75 focus-visible:underline"
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
                <Link className="block h-8" href="/countries/" title={capitalize(t('language-and-region-settings'))}>
                    <CurrentLocaleFlag locale={locale} />
                </Link>

                {hasCopyrights ? (
                    <div className="flex gap-2 text-xs font-black uppercase lg:text-sm">
                        <PrismicText data={footer.copyrights} styled={false} />
                    </div>
                ) : null}
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

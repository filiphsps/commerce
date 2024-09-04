import 'server-only';

import { FiMail, FiPhone } from 'react-icons/fi';

import type { OnlineShop } from '@nordcom/commerce-db';

import { MenuApi } from '@/api/navigation';
import { useTranslation } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

import { LocaleFlag } from '@/components/informational/locale-flag';
import Link from '@/components/link';

import type { Locale, LocaleDictionary } from '@/utils/locale';
import type { HTMLProps } from 'react';

const BLOCK_STYLES = 'flex gap-2 *:text-sm *:leading-none';
const LINK_STYLES = 'flex items-center justify-center gap-1 hover:underline hover:text-primary';

type InfoBarProps = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
} & HTMLProps<HTMLDivElement>;
export async function InfoBar({ className, shop, locale, i18n, ...props }: InfoBarProps) {
    const menu = await MenuApi({ shop, locale });
    const { t } = useTranslation('common', i18n);

    if (menu.show_info_bar === false) {
        return null;
    }

    const divider = <div className="font-bold">|</div>;

    const email = menu.email?.trim() || undefined;
    const phone = menu.phone?.replaceAll(' ', '').replaceAll('-', '').trim() || undefined;

    return (
        <section
            className="flex h-8 w-full flex-col items-center justify-center bg-gray-100 text-black [grid-area:info-bar]"
            data-nosnippet={true}
            {...props}
        >
            <section
                {...props}
                className={cn(
                    'mx-auto flex h-8 w-full max-w-[var(--page-width)] items-center justify-between gap-1 px-3 py-1 md:px-3',
                    className
                )}
            >
                <div className={BLOCK_STYLES}>
                    <Link
                        className="group flex items-center justify-start gap-1"
                        href="/countries/"
                        title={t('language-and-region-settings')}
                        data-nosnippet={true}
                    >
                        <LocaleFlag
                            locale={locale}
                            className="block h-3 object-left"
                            nameClassName="group-hover:text-primary group-hover:underline"
                            withName={true}
                            priority={true}
                        />
                    </Link>
                </div>

                <div className={BLOCK_STYLES}>
                    <div className="hidden md:visible">{t('contact')}: </div>
                    <div className="flex gap-3 *:select-none">
                        {email && email.length > 0 ? (
                            <Link
                                href={`mailto:${email}`}
                                className={LINK_STYLES}
                                title={t('email-tooltip')}
                                data-nosnippet={true}
                            >
                                <FiMail className="h-4 text-lg" style={{ strokeWidth: 2.5 }} />
                                {t('email')}
                            </Link>
                        ) : null}

                        {email && phone ? divider : null}

                        {phone && phone.length > 0 ? (
                            <Link
                                href={`tel:${phone}`}
                                className={LINK_STYLES}
                                title={t('phone-tooltip')}
                                data-nosnippet={true}
                            >
                                <FiPhone className="h-4 text-lg" style={{ strokeWidth: 2.5 }} />
                                {t('phone')}
                            </Link>
                        ) : null}
                    </div>
                </div>
            </section>
        </section>
    );
}

import 'server-only';

import { FiMail, FiPhone } from 'react-icons/fi';

import { useTranslation } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

import { LocaleFlag } from '@/components/informational/locale-flag';
import Link from '@/components/link';

import type { Locale, LocaleDictionary } from '@/utils/locale';
import type { HTMLProps } from 'react';

const BLOCK_STYLES = 'flex gap-2 *:text-sm *:leading-none';
const LINK_STYLES = 'flex items-center justify-center gap-1 hover:underline';

type InfoBarProps = {
    locale: Locale;
    i18n: LocaleDictionary;
} & HTMLProps<HTMLDivElement>;
export const InfoBar = ({ className, locale, i18n, ...props }: InfoBarProps) => {
    const { t } = useTranslation('common', i18n);

    const divider = <div className="font-bold">|</div>;

    return (
        <section
            className="bg-secondary text-secondary-foreground flex w-full grow flex-col items-center justify-center"
            {...props}
        >
            <section
                {...props}
                className={cn(
                    'mx-auto flex h-8 w-full max-w-[var(--page-width)] items-center justify-between gap-1 px-3 py-1 md:px-2 md:py-2',
                    className
                )}
            >
                <div className={BLOCK_STYLES}>
                    <Link
                        className="flex items-center justify-center gap-1"
                        href="/countries/"
                        title={t('language-and-region-settings')}
                    >
                        <LocaleFlag locale={locale} className="block h-3" withName={true} priority={true} />
                    </Link>
                </div>

                <div className={BLOCK_STYLES}>
                    <div className="hidden md:visible">{t('contact')}: </div>
                    <div className="flex gap-3 *:select-none">
                        <Link
                            href="mailto:support@swedish-candy-store.com"
                            className={LINK_STYLES}
                            title={t('email-tooltip')}
                        >
                            <FiMail className="h-3" style={{ strokeWidth: 2.5 }} />
                            {t('email')}
                        </Link>

                        {divider}

                        <Link href="tel:+1-866-502-5580" className={LINK_STYLES} title={t('phone-tooltip')}>
                            <FiPhone className="h-3" style={{ strokeWidth: 2.5 }} />
                            {t('phone')}
                        </Link>
                    </div>
                </div>
            </section>
        </section>
    );
};

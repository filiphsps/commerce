'use client';

import type { OnlineShop } from '@nordcom/commerce-db';
import type { Country, LanguageCode } from '@shopify/hydrogen-react/storefront-api-types';
import { setCookie } from 'cookies-next';
import { Check as CheckIcon, ChevronDown as ChevronDownIcon, X as XIcon } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import useGeoLocation from 'react-ipgeolocation';
import { Button } from '@/components/actionable/button';
import { LocaleCountryName, LocaleFlag } from '@/components/informational/locale-flag';
import Link from '@/components/link';
import { getDictionary } from '@/utils/dictionary';
import { isCrawler } from '@/utils/is-crawler';
import type { LocaleDictionary } from '@/utils/locale';
import { capitalize, getTranslations, Locale } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

const DISMISSED_KEY = 'geo-redirect-banner-dismissed';

const subscribeToNothing = () => () => {};
const getNavigatorLanguage = () => (navigator.language.split('-').at(0) || 'en').toLowerCase();
const getUserAgent = () => navigator.userAgent;
const readStoredDismissed = (): number | null => {
    if (typeof localStorage === 'undefined') {
        return null;
    }

    const stored = localStorage.getItem(DISMISSED_KEY);
    if (!stored) {
        return null;
    }

    const value = Number.parseInt(stored, 10);
    if (!value) {
        return null;
    }

    // FIXME: Make this configurable.
    // Check if dismissed is more than 1 days ago.
    if (value < Date.now() - 1000 * 60 * 60 * 24 * 1) {
        localStorage.removeItem(DISMISSED_KEY);
        return null;
    }

    return value;
};

export type GeoRedirectProps = {
    countries: Country[];
    locale: Locale;
    shop: OnlineShop;
    i18n: LocaleDictionary;
};
export function GeoRedirect({ countries, locale, shop, i18n: defaultI18n }: GeoRedirectProps) {
    const [closed, setClosed] = useState(false);
    const [i18n, setI18n] = useState<LocaleDictionary | undefined>();

    const navigatorLanguage = useSyncExternalStore<string | undefined>(
        subscribeToNothing,
        getNavigatorLanguage,
        () => undefined,
    );
    const userAgent = useSyncExternalStore<string | undefined>(subscribeToNothing, getUserAgent, () => undefined);
    const dismissed = useSyncExternalStore<number | null>(subscribeToNothing, readStoredDismissed, () => null);

    const pathname = `/${usePathname().split('/').slice(2).join('/')}`;
    const searchParams = useSearchParams();

    // Track previous pathname to reset dropdown only when navigation occurs.
    const [dropdownActiveState, setDropdownActive] = useState(false);
    const [lastPathname, setLastPathname] = useState(pathname);
    let dropdownActive = dropdownActiveState;
    if (pathname !== lastPathname) {
        setLastPathname(pathname);
        setDropdownActive(false);
        dropdownActive = false;
    }

    const { t } = getTranslations('common', i18n || defaultI18n);

    const location = useGeoLocation();

    const targetCountry =
        location.country !== undefined
            ? countries.find(({ isoCode }) => isoCode.toLowerCase() === location.country!.toLowerCase())
            : null;

    const targetLanguage = targetCountry
        ? (
              targetCountry.availableLanguages.find(({ isoCode }) => isoCode.toLowerCase() === navigatorLanguage) ||
              targetCountry.availableLanguages[0]
          ).isoCode.toLowerCase()
        : null;

    const targetLocale =
        targetCountry && targetLanguage
            ? Locale.from({ language: targetLanguage as LanguageCode, country: targetCountry.isoCode })
            : null;

    // Update dictionary if the predicted locale is different.
    useEffect(() => {
        if (!location.country || i18n !== undefined || !targetLocale || !navigatorLanguage) {
            return;
        }

        getDictionary({ shop, locale: targetLocale }).then(setI18n);
    }, [location, i18n, targetLocale, navigatorLanguage, shop]);

    if (
        dismissed ||
        closed ||
        !location.country ||
        location.country === locale.country ||
        !targetLocale ||
        !userAgent ||
        isCrawler(userAgent)
    ) {
        return null;
    }

    return (
        <div className="sticky inset-x-0 bottom-0 z-50 w-full border-0 border-gray-300 border-b-2 border-solid bg-gray-100 px-2 py-3 text-black transition-all md:px-2">
            <div className="relative mx-auto flex w-full flex-col items-start justify-between gap-3 py-2 pt-4 md:grid md:max-w-[var(--page-width)] md:grid-cols-[1fr_auto] md:items-center md:gap-4 md:px-3 md:pr-12">
                <div className="flex w-full select-none flex-wrap items-center gap-x-2 gap-y-0 pr-11 font-normal text-sm leading-tight md:pr-0 md:text-base lg:gap-x-3">
                    <div data-nosnippet={true}>
                        {t(
                            'geo-redirect-message',
                            <span className="font-semibold" key={targetLocale.code} data-nosnippet={true}>
                                <LocaleCountryName locale={targetLocale} />
                            </span>,
                        )}
                    </div>
                </div>

                <div className="flex w-full grow gap-3 md:w-96">
                    <div
                        className={cn(
                            'relative flex h-10 w-full cursor-pointer select-none flex-col gap-0 rounded-lg border-2 border-white border-solid bg-white shadow focus-within:border-primary',
                            dropdownActive && 'rounded-b-none border-primary border-b-0',
                            !dropdownActive && 'hover:border-gray-400',
                        )}
                    >
                        <button
                            type="button"
                            className={cn(
                                'flex h-10 w-full grow cursor-pointer select-none appearance-none items-center justify-start gap-3 rounded-lg p-2 text-base leading-none *:select-none focus-within:bg-gray-100 hover:bg-gray-100',
                                dropdownActive && 'hover:border-primary',
                            )}
                            onClick={() => setDropdownActive(!dropdownActive)}
                        >
                            <div className="w-5">
                                <CheckIcon className="h-4 stroke-1 text-2xl text-inherit" />
                            </div>
                            <div className="flex gap-1 text-inherit">
                                <LocaleFlag
                                    locale={targetLocale}
                                    className="block h-4"
                                    nameClassName="group-hover:text-primary group-hover:underline leading-none h-4"
                                    withName={true}
                                    priority={true}
                                />
                            </div>
                            <div className="flex h-4 w-full items-end justify-end text-inherit leading-none">
                                <ChevronDownIcon className="stroke-1 text-2xl text-inherit" />
                            </div>
                        </button>

                        <Link
                            href="/countries/"
                            className={cn(
                                'absolute inset-x-0 top-9 -left-[2px] flex h-10 w-[calc(100%+4px)] cursor-pointer select-none gap-3 rounded-b-lg bg-white p-2 text-base text-gray-600 *:select-none focus-within:bg-gray-100 focus-within:text-black hover:bg-gray-100 hover:text-black',
                                dropdownActive && 'border-2 border-primary border-t-0 border-solid shadow-xl',
                                !dropdownActive && 'hidden',
                            )}
                        >
                            <div className="w-5"></div>
                            <div className="text-inherit" data-nosnippet={true}>
                                Another country or region
                            </div>
                        </Link>
                    </div>

                    <Button
                        as={Link}
                        onClick={() => {
                            setCookie('localization', targetLocale.code);
                            setCookie('NEXT_LOCALE', targetLocale.code);
                        }}
                        href={`${pathname}${searchParams.size > 0 ? `?${searchParams.toString()}` : ''}`}
                        locale={targetLocale}
                        className="flex h-10 items-center justify-center rounded-lg border-primary px-4 py-2 text-base shadow transition-colors"
                    >
                        {capitalize(t('continue'))}
                    </Button>
                </div>

                <Button
                    title={'Close'}
                    onClick={() => {
                        localStorage.setItem(DISMISSED_KEY, Date.now().toString());
                        setClosed(true);
                    }}
                    className="absolute top-4 right-0 flex h-10 w-10 items-start justify-end text-current text-lg opacity-70 invert-[20%] transition-all hover:opacity-100 hover:invert-0 focus-visible:invert-0 md:items-center 2xl:right-2"
                    styled={false}
                >
                    <XIcon className="block size-6 md:size-6" />
                </Button>
            </div>
        </div>
    );
}

'use client';

import { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import useGeoLocation from 'react-ipgeolocation';

import { Locale } from '@/utils/locale';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/actionable/button';
import { LocaleFlag } from '@/components/informational/locale-flag';
import Link from '@/components/link';

import type { Country, LanguageCode } from '@shopify/hydrogen-react/storefront-api-types';

const DISMISSED_KEY = 'geo-redirect-banner-dismissed';

export type GeoRedirectProps = {
    countries: Country[];
    locale: Locale;
};
export function GeoRedirect({ countries, locale }: GeoRedirectProps) {
    const [closed, setClosed] = useState(false);
    const [dismissed, setDismissed] = useState<number | null>(null);
    const pathname = `/${usePathname().split('/').slice(2).join('/')}`;

    useEffect(() => {
        if (!(localStorage as any)) {
            return;
        }

        const value = localStorage.getItem(DISMISSED_KEY)
            ? Number.parseInt(localStorage.getItem(DISMISSED_KEY) as string)
            : null;
        setDismissed(value);

        // FIXME: Make this configurable.
        // Check if dismissed is more than 3 days ago.
        if (value && value < Date.now() - 1000 * 60 * 60 * 24 * 3) {
            localStorage.removeItem(DISMISSED_KEY);
            setDismissed(null);
        }
    }, []);

    const location = useGeoLocation();
    if (
        dismissed ||
        closed ||
        !location.country ||
        location.country === locale.country ||
        /bot|googlebot|crawler|spider|robot|crawling/i.test(navigator.userAgent)
    ) {
        return null;
    }

    const targetCountry = countries.find(({ isoCode }) => isoCode.toLowerCase() === location.country!.toLowerCase());
    if (!targetCountry) {
        return null;
    }

    const targetLanguage = (
        targetCountry.availableLanguages.find(
            ({ isoCode }) => isoCode.toLowerCase() === (navigator.language.split('-').at(0) || 'en').toLowerCase()
        ) || targetCountry.availableLanguages[0]
    ).isoCode.toLowerCase();

    const targetLocale = Locale.from({ language: targetLanguage as LanguageCode, country: targetCountry.isoCode });

    return (
        <div className="sticky inset-x-0 bottom-0 z-50 w-full border-0 border-b-2 border-solid border-gray-300 bg-white px-2 text-black transition-all md:px-2 lg:py-4 2xl:px-0">
            <div className="relative mx-auto flex w-full flex-col items-start justify-between gap-4 py-2 pt-4 md:max-w-[var(--page-width)] md:px-2 md:py-4 lg:gap-4">
                <div className="flex w-full flex-wrap items-center gap-x-2 gap-y-0 pr-11 text-lg font-normal leading-tight md:pr-0 md:text-xl lg:gap-x-3">
                    <div>Looks like you are located in</div>
                    <div className="flex items-center gap-1 leading-none">
                        <LocaleFlag
                            locale={targetLocale}
                            className="block h-4"
                            nameClassName="group-hover:text-primary group-hover:underline font-bold"
                            withName={true}
                            priority={true}
                            suffix={'.'}
                        />
                    </div>
                    <div>Would you like to visit you country&apos;s local store instead?</div>
                </div>

                <div className="flex w-full flex-wrap justify-start gap-x-2 gap-y-2 pr-16 font-semibold md:gap-x-4 md:pr-0 lg:gap-x-6">
                    <Button
                        as={Link}
                        href={pathname}
                        locale={targetLocale}
                        className="border-primary flex items-center justify-center text-lg transition-colors"
                    >
                        Take me there!
                    </Button>
                    <Button
                        onClick={() => {
                            setClosed(true);
                            localStorage.setItem(DISMISSED_KEY, Date.now().toString());
                        }}
                        styled={false}
                        className="hover:text-primary text-lg transition-colors"
                    >
                        Stay here
                    </Button>
                </div>

                <Button
                    title={'Close'}
                    onClick={() => setClosed(true)}
                    className="absolute right-0 top-4 flex h-10 w-10 items-start justify-end text-lg text-current opacity-70 invert-[20%] transition-all hover:opacity-100 hover:invert-0 2xl:right-2"
                    styled={false}
                >
                    <FiX className="block size-6 md:size-6" />
                </Button>
            </div>
        </div>
    );
}

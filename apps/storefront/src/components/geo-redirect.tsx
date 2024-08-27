'use client';

import { useEffect, useState } from 'react';
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
        <div className="bg-primary text-primary-foreground sticky inset-x-0 bottom-0 z-50 w-full border-0 border-t-2 border-solid border-gray-700 p-4 shadow-2xl transition-all lg:px-6">
            <div className="mx-auto flex flex-col items-start justify-between gap-5 md:max-w-[var(--page-width)] lg:px-2">
                <div className="flex flex-wrap items-center gap-2 gap-y-0 text-xl font-normal leading-tight">
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

                <div className="flex flex-wrap justify-start gap-4 gap-y-2 font-semibold">
                    <Button
                        as={Link}
                        href={pathname}
                        locale={targetLocale}
                        className="bg-primary-foreground text-primary hover:bg-primary-light hover:text-primary-foreground flex items-center justify-center text-lg transition-colors"
                    >
                        Take me there!
                    </Button>
                    <Button
                        onClick={() => {
                            setClosed(true);
                            localStorage.setItem(DISMISSED_KEY, Date.now().toString());
                        }}
                        className="border-primary-foreground hover:bg-primary-foreground hover:text-primary flex items-center justify-center border-2 border-solid text-lg font-normal text-inherit transition-colors"
                    >
                        Stay here
                    </Button>
                </div>
            </div>
        </div>
    );
}

'use client';

import { useState } from 'react';
import useGeoLocation from 'react-ipgeolocation';

import { Locale } from '@/utils/locale';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/actionable/button';
import { LocaleFlag } from '@/components/informational/locale-flag';
import Link from '@/components/link';

import type { Country, LanguageCode } from '@shopify/hydrogen-react/storefront-api-types';

export type GeoRedirectProps = {
    countries: Country[];
    locale: Locale;
};
export function GeoRedirect({ countries, locale }: GeoRedirectProps) {
    const [closed, setClosed] = useState(false);
    const pathname = `/${usePathname().split('/').slice(2).join('/')}`;

    const location = useGeoLocation();
    if (
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
            <div className="mx-auto flex flex-col items-start justify-between gap-4 md:max-w-[var(--page-width)] md:flex-row md:items-center">
                <div className="flex flex-wrap items-center gap-2 gap-y-0 text-lg font-medium leading-snug">
                    <div>Looks like you are located in</div>
                    <div
                        className="border-primary-foreground flex items-center gap-1 border-0 border-b-2 border-solid px-1 leading-none"
                        suppressHydrationWarning={true}
                    >
                        <LocaleFlag
                            locale={targetLocale}
                            className="block h-4"
                            nameClassName="group-hover:text-primary group-hover:underline font-semibold"
                            withName={true}
                            priority={true}
                            suffix={'.'}
                            suppressHydrationWarning={true}
                        />
                    </div>
                    <div>Would you like to visit you country&apos;s local store instead?</div>
                </div>

                <div className="flex flex-wrap gap-4 gap-y-2 font-semibold">
                    <Button
                        as={Link}
                        href={pathname}
                        locale={targetLocale}
                        styled={false}
                        className="bg-primary-foreground text-primary hover:bg-primary-light hover:text-primary-foreground flex items-center justify-center rounded-2xl px-4 py-1 transition-colors lg:px-5 lg:py-2"
                        suppressHydrationWarning={true}
                    >
                        Take me there!
                    </Button>
                    <Button
                        onClick={() => setClosed(true)}
                        styled={false}
                        className="border-primary-foreground hover:bg-primary-foreground hover:text-primary flex items-center justify-center rounded-2xl border-2 border-solid px-4 py-1 font-normal text-inherit opacity-75 transition-colors lg:px-5 lg:py-2"
                        suppressHydrationWarning={true}
                    >
                        Stay here
                    </Button>
                </div>
            </div>
        </div>
    );
}

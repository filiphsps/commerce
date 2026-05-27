'use client';

import type { Country } from '@shopify/hydrogen-react/storefront-api-types';
import { byIso as countryLookup } from 'country-code-lookup';
import Image from 'next/image';
import { useRef } from 'react';
import Link from '@/components/link';
import { useShop } from '@/components/shop/provider';
import { Label } from '@/components/typography/label';
import { FLAG_IMAGES_BASE_URL } from '@/utils/build-config';
import { Locale } from '@/utils/locale';
import styles from './countries.module.css';

type LocaleSelectorProps = {
    countries: Country[];
    locale: Locale;
};
/**
 * Client component that renders a grid of locale links for the countries page.
 * Clicking a locale link updates a hidden input and programmatically submits
 * the parent form so the locale change can be handled server-side without a
 * full page reload.
 *
 * @param countries - The list of Shopify countries with available languages.
 * @param locale - The currently active locale, used to highlight the active entry.
 * @returns The locale selector grid element.
 */
export default function LocaleSelector({ countries = [], locale }: LocaleSelectorProps) {
    const { shop } = useShop();
    const localeRef = useRef<HTMLInputElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const markets = countries
        .map((country) =>
            country.availableLanguages.map((language) => ({
                locale: `${language.isoCode.toLowerCase()}-${country.isoCode.toUpperCase()}`,
                country: country.name,
                language: language.name,
                languageEndonym: language.endonymName || language.name,
                currency: country.currency.isoCode,
            })),
        )
        .filter((i) => (i?.length || 0) > 0);

    return (
        <div className={styles.list}>
            <input ref={localeRef} type="hidden" name="locale" />
            <button ref={buttonRef} type="submit" className="hidden">
                Change locale
            </button>

            {markets.flatMap((markets) =>
                markets.map((country) => {
                    if (!country.locale) {
                        return null;
                    }

                    let info: ReturnType<typeof countryLookup> | null = null;
                    try {
                        info = countryLookup(country.country);
                    } catch {}

                    return (
                        <Link
                            key={country.locale}
                            href={`/${country.locale}/`} // TODO: Go to the previous route
                            shop={shop}
                            locale={Locale.from(country.locale)!}
                            title={`${country.country} (${country.languageEndonym})`}
                            className={`${styles.locale} ${(country.locale === locale.code && styles.active) || ''}`}
                            scroll={false}
                            replace={true}
                            onClick={(e) => {
                                e.preventDefault();
                                if (localeRef.current) localeRef.current.value = country.locale;
                                buttonRef.current?.click();
                            }}
                        >
                            <div className={styles.flag}>
                                <Image
                                    src={`${FLAG_IMAGES_BASE_URL}/${country.locale.split('-').at(-1)}.svg`}
                                    alt={country.country}
                                    fill
                                    aria-label={country.country}
                                    sizes="35px"
                                    draggable={false}
                                    priority={false}
                                    loading="lazy"
                                    decoding="async"
                                />
                            </div>
                            <Label>
                                {info?.country ?? country.country} ({country.languageEndonym})
                            </Label>
                            <Label>{country.currency}</Label>
                        </Link>
                    );
                }),
            )}
        </div>
    );
}

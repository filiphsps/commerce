'use client';

import styles from './countries.module.scss';

import { useRef } from 'react';
import Image from 'next/image';

import type { Shop } from '@nordcom/commerce-database';

import { Locale } from '@/utils/locale';

import Link from '@/components/link';
import { Label } from '@/components/typography/label';

import type { Country } from '@shopify/hydrogen-react/storefront-api-types';

type LocaleSelectorProps = {
    shop: Shop;
    countries: Country[];
    locale: Locale;
};
export default function LocaleSelector({ shop, countries, locale }: LocaleSelectorProps) {
    const localeRef = useRef<HTMLInputElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const markets = (
        countries.map((country) =>
            country.availableLanguages.map((language) => ({
                locale: `${language.isoCode.toLowerCase()}-${country.isoCode.toUpperCase()}`,
                country: country.name,
                language: language.name,
                currency: country.currency.isoCode
            }))
        ) || []
    ).filter((i) => i && i.length > 0);

    return (
        <div className={styles.list}>
            <input ref={localeRef} type="hidden" name="locale" />
            <button ref={buttonRef} type="submit" style={{ display: 'none' }}>
                Change locale
            </button>

            {markets.flatMap((markets) =>
                markets.map((country) => {
                    return (
                        <Link
                            key={country.locale}
                            href={`/${country.locale}/`} // TODO: Go to the previous route
                            shop={shop}
                            locale={Locale.from(country.locale)!}
                            title={`${country.country} (${country.language})`}
                            className={`${styles.locale} ${(country.locale === locale.code && styles.active) || ''}`}
                            scroll={false}
                            replace={true}
                            onClick={(e) => {
                                e.preventDefault();
                                localeRef.current!.value = country.locale;
                                buttonRef.current?.click();
                            }}
                        >
                            <div className={styles.flag}>
                                <Image
                                    src={`https://purecatamphetamine.github.io/country-flag-icons/3x2/${country.locale
                                        .split('-')
                                        .at(-1)}.svg`}
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
                                {country.country} ({country.language})
                            </Label>
                            <Label>{country.currency}</Label>
                        </Link>
                    );
                })
            )}
        </div>
    );
}
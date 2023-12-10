'use client';

import type { Shop } from '@/api/shop';
import Link from '@/components/link';
import type { StoreModel } from '@/models/StoreModel';
import { Locale } from '@/utils/locale';
import type { Country } from '@shopify/hydrogen-react/storefront-api-types';
import Image from 'next/image';
import { useRef } from 'react';
import { styled } from 'styled-components';
import styles from './countries.module.scss';

const List = styled.article`
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--block-spacer);
    padding: var(--block-spacer-small) 0 var(--block-spacer-large) 0;

    @media (min-width: 950px) {
        grid-template-columns: repeat(auto-fit, minmax(26rem, 1fr));
    }
`;

const Flag = styled.div`
    position: relative;
    overflow: hidden;
    height: 4rem;
    width: 4rem;
    border-radius: 100%;

    img {
        object-fit: cover;
        width: 100%;
        height: 100%;
    }
`;

const Label = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: start;
    height: 100%;
    font-weight: 500;
    font-size: 1.75rem;
    line-height: 2rem;
`;

const Currency = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    font-size: 1.75rem;
    font-weight: 700;
`;

type LocaleSelectorProps = {
    shop: Shop;
    store?: StoreModel;
    countries: Country[];
    locale: Locale;
};
export default function LocaleSelector({ shop, countries, locale }: LocaleSelectorProps) {
    const localeRef = useRef<HTMLInputElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const markets = (
        countries?.map((country) =>
            country.availableLanguages.map((language) => ({
                locale: `${language.isoCode.toLowerCase()}-${country.isoCode.toUpperCase()}`,
                country: country.name,
                language: language.name,
                currency: country.currency.isoCode
            }))
        ) || []
    ).filter((i) => i && i.length > 0);

    return (
        <List>
            <input ref={localeRef} type="hidden" name="locale" />
            <button ref={buttonRef} type="submit" style={{ display: 'none' }}>
                Change locale
            </button>

            {markets.flatMap(
                (markets) =>
                    markets?.map((country) => {
                        return (
                            <Link
                                key={country.locale}
                                href={`/${country.locale}/`} // TODO: Go to the previous route
                                shop={shop}
                                locale={Locale.from(country.locale)!}
                                title={`${country.country} (${country.language})`}
                                className={`${styles.locale} ${
                                    (country.locale === locale.code && styles.active) || ''
                                }`}
                                scroll={false}
                                replace={true}
                                onClick={(e) => {
                                    e.preventDefault();
                                    localeRef.current!.value = country.locale;
                                    buttonRef.current?.click();
                                }}
                            >
                                <Flag>
                                    <Image
                                        src={`https://purecatamphetamine.github.io/country-flag-icons/3x2/${country.locale
                                            .split('-')
                                            .at(-1)}.svg`}
                                        alt={country.country}
                                        fill
                                        aria-label={country.country}
                                        sizes="35px"
                                    />
                                </Flag>
                                <Label>
                                    {country.country} ({country.language})
                                </Label>
                                <Currency>{country.currency}</Currency>
                            </Link>
                        );
                    })
            )}
        </List>
    );
}

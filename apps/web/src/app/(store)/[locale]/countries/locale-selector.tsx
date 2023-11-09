'use client';

import { useRouter } from 'next/navigation';

import Link from '@/components/link';
import type { StoreModel } from '@/models/StoreModel';
import { Locale, NextLocaleToLocale } from '@/utils/locale';
import type { Country } from '@shopify/hydrogen-react/storefront-api-types';
import Image from 'next/image';
import { styled } from 'styled-components';

const List = styled.article`
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--block-spacer);
    padding: var(--block-spacer-small) 0 var(--block-spacer-large) 0;

    @media (min-width: 950px) {
        grid-template-columns: repeat(auto-fit, minmax(26rem, 1fr));
    }
`;

const Locale = styled(Link)`
    display: grid;
    grid-template-columns: auto 1fr auto;
    justify-content: stretch;
    align-items: center;
    gap: var(--block-spacer-large);
    width: 100%;
    padding: var(--block-padding);
    border: var(--block-border-width) solid var(--color-block);
    border-radius: var(--block-border-radius);
    background: var(--color-block);
    transition: 150ms ease-in-out;
    cursor: pointer;

    &.active {
        color: var(--accent-primary);
        border-color: var(--accent-primary);
    }

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            border-color: var(--accent-secondary);
            background: var(--accent-secondary-light);
            color: var(--accent-secondary-text);
        }
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
    store?: StoreModel;
    countries: Country[];
    locale: Locale;
};
export default function LocaleSelector({ countries, locale }: LocaleSelectorProps) {
    const router = useRouter();

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
            {markets.flatMap(
                (markets) =>
                    markets?.map((country) => {
                        return (
                            <Locale
                                key={country.locale}
                                href={`/countries/`} // TODO: Go to the previous route
                                locale={NextLocaleToLocale(country.locale)!}
                                title={`${country.country} (${country.language})`}
                                className={(country.locale === locale.locale && 'active') || ''}
                                scroll={false}
                                prefetch={false}
                                replace={true}
                            >
                                <Flag>
                                    <Image
                                        src={`https://purecatamphetamine.github.io/country-flag-icons/3x2/${country.locale
                                            .split('-')
                                            .at(-1)}.svg`}
                                        alt={country.country}
                                        fill
                                        aria-label={country.country}
                                    />
                                </Flag>
                                <Label>
                                    {country.country} ({country.language})
                                </Label>
                                <Currency>{country.currency}</Currency>
                            </Locale>
                        );
                    })
            )}
        </List>
    );
}

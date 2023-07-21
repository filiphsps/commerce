import { Fragment, FunctionComponent } from 'react';

import { AnalyticsPageType } from '@shopify/hydrogen-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Config } from '../src/util/Config';
import Content from '@/components/Content';
import { CountriesApi } from '../src/api/store';
import { Country } from '@shopify/hydrogen-react/storefront-api-types';
import Image from 'next/image';
import Link from 'next/link';
import { NextSeo } from 'next-seo';
import Page from '@/components/Page';
import PageContent from '@/components/PageContent';
import PageHeader from '@/components/PageHeader';
import { StoreModel } from '../src/models/StoreModel';
import styled from 'styled-components';
import { useRouter } from 'next/router';
import useSWR from 'swr';

const LocalesList = styled.article`
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--block-spacer);
    padding: var(--block-spacer-small) 0px var(--block-spacer-large) 0px;

    @media (min-width: 950px) {
        grid-template-columns: repeat(auto-fit, minmax(26rem, 1fr));
    }
`;

const LocaleCurrency = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    font-size: 1.75rem;
    font-weight: 700;
`;

const Locale = styled(Link)<{ active: boolean }>`
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
    transition: 250ms ease-in-out;

    &:hover {
        border-color: var(--accent-secondary);
        background: var(--accent-secondary-light);
        color: var(--accent-primary);
    }
`;

const LocaleFlag = styled.div`
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
const LocaleLabel = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: start;
    height: 100%;
    font-weight: 500;
    font-size: 1.75rem;
    line-height: 2rem;
`;

interface LocalePageProps {
    store: StoreModel;
    countries: Country[];
}
const LocalePage: FunctionComponent<LocalePageProps> = ({ store, countries: countriesData }) => {
    const router = useRouter();

    const { data: countries } = useSWR(
        [`locales`],
        () =>
            CountriesApi({
                locale: router?.locale
            }),
        {
            fallbackData: countriesData
        }
    );

    const shippingToCountries = countries?.flatMap((country) => country.name) || [];
    const locales = (
        countries?.map((country) =>
            country.availableLanguages
                .map((language) => ({
                    locale: `${language.isoCode.toLowerCase()}-${country.isoCode.toUpperCase()}`,
                    country: country.name,
                    language: language.name,
                    currency: country.currency.isoCode
                }))
                .filter((locale) => router.locales && router.locales.includes(locale.locale))
        ) || []
    ).filter((i) => i && i.length > 0);

    return (
        <Page className="LocalePage">
            <NextSeo
                title="Locales"
                canonical={`https://${Config.domain}/${router.locale}/locales/`}
                languageAlternates={
                    router?.locales?.map((locale) => ({
                        hrefLang: locale,
                        href: `https://${Config.domain}/${
                            (locale !== 'x-default' && `${locale}/`) || ''
                        }locales/`
                    })) || []
                }
            />

            <PageContent primary>
                <PageContent>
                    <PageHeader title="Set your region and preferred language" />

                    <LocalesList>
                        {locales.flatMap((locales) =>
                            locales.map((locale) => {
                                return (
                                    <Locale
                                        key={locale.locale}
                                        active={locale.locale === router.locale}
                                        href="/"
                                        locale={locale.locale}
                                        title={`${locale.country} (${locale.language})`}
                                    >
                                        <LocaleFlag>
                                            <Image
                                                src={`http://purecatamphetamine.github.io/country-flag-icons/3x2/${locale.locale
                                                    .split('-')
                                                    .at(-1)}.svg`}
                                                alt={locale.country}
                                                fill
                                                aria-label={locale.country}
                                            />
                                        </LocaleFlag>
                                        <LocaleLabel>
                                            {locale.country} ({locale.language})
                                        </LocaleLabel>
                                        <LocaleCurrency>{locale.currency}</LocaleCurrency>
                                    </Locale>
                                );
                            })
                        )}
                    </LocalesList>

                    <Content>
                        <h3>Additionally we also ship to</h3>
                        {shippingToCountries.map((country, index) => (
                            <Fragment key={country}>
                                <small>{country}</small>
                                {(index + 1 !== shippingToCountries.length && ', ') || ''}
                            </Fragment>
                        ))}
                    </Content>
                </PageContent>

                <Breadcrumbs
                    pages={[
                        {
                            title: 'Locales',
                            url: '/locales/'
                        }
                    ]}
                    store={store}
                />
            </PageContent>
        </Page>
    );
};

export async function getStaticProps({ locale }) {
    return {
        props: {
            countries: await CountriesApi({
                locale
            }),
            analytics: {
                pageType: AnalyticsPageType.page
            }
        },
        revalidate: 60
    };
}

export default LocalePage;

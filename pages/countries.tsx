import styled, { css } from 'styled-components';

import { AnalyticsPageType } from '@shopify/hydrogen-react';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Config } from '../src/util/Config';
import { CountriesApi } from '../src/api/store';
import type { Country } from '@shopify/hydrogen-react/storefront-api-types';
import type { CustomPageDocument } from 'prismicio-types';
import { FunctionComponent } from 'react';
import Image from 'next/image';
import { NextSeo } from 'next-seo';
import Page from '@/components/Page';
import PageContent from '@/components/PageContent';
import PageHeader from '@/components/PageHeader';
import { SliceZone } from '@prismicio/react';
import type { StoreModel } from '../src/models/StoreModel';
import { captureException } from '@sentry/nextjs';
import { components } from '../slices';
import { createClient } from 'prismicio';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { useTranslation } from 'next-i18next';

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

const Locale = styled.div<{ $selected?: boolean }>`
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
    cursor: pointer;

    ${({ $selected }) =>
        $selected &&
        css`
            color: var(--accent-primary);
            border-color: var(--accent-primary);
        `}

    &:hover {
        border-color: var(--accent-secondary);
        background: var(--accent-secondary-light);
        color: var(--accent-secondary-text);
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

interface CountriesPageProps {
    page?: CustomPageDocument<string>;
    countries: Country[];
    store: StoreModel;
}
const CountriesPage: FunctionComponent<CountriesPageProps> = ({
    page,
    countries: countriesData,
    store
}) => {
    const router = useRouter();
    const { i18n } = useTranslation('common');

    const { data: countries } = useSWR(
        [`locales`],
        () =>
            CountriesApi({
                locale: router.locale
            }),
        {
            fallbackData: countriesData
        }
    );

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
        <Page className="CountriesPage">
            <NextSeo
                title={page?.data.meta_title || 'Countries'}
                description={page?.data.meta_title || 'Set your region and preferred language'}
                canonical={`https://${Config.domain}/${router.locale}/countries/`}
                languageAlternates={
                    router.locales?.map((locale) => ({
                        hrefLang: locale,
                        href: `https://${Config.domain}/${
                            (locale !== 'x-default' && `${locale}/`) || ''
                        }locales/`
                    })) || []
                }
            />

            <PageContent primary>
                <PageContent>
                    <PageHeader
                        title={page?.data.title || 'Set your region and preferred language'}
                        subtitle={page?.data.description || null}
                    />

                    <LocalesList>
                        {locales.flatMap(
                            (locales) =>
                                locales?.map((locale) => {
                                    return (
                                        <Locale
                                            key={locale.locale}
                                            title={`${locale.country} (${locale.language})`}
                                            $selected={locale.locale === router.locale}
                                            onClick={async () => {
                                                // TODO: Go to previous page in history
                                                await router.push('/', undefined, {
                                                    locale: locale.locale
                                                });
                                                await i18n.changeLanguage(
                                                    locale.locale.split('-').at(0)
                                                );
                                            }}
                                        >
                                            <LocaleFlag>
                                                <Image
                                                    src={`https://purecatamphetamine.github.io/country-flag-icons/3x2/${locale.locale
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
                </PageContent>

                <SliceZone slices={page?.data.slices} components={components} context={{ store }} />

                <Breadcrumbs
                    pages={[
                        {
                            title: page?.data.title || 'Countries',
                            url: '/countries/'
                        }
                    ]}
                    store={store}
                />
            </PageContent>
        </Page>
    );
};

export async function getStaticProps({ locale, previewData }) {
    const client = createClient({ previewData });
    try {
        const uid = 'countries';

        let page: any = null;
        try {
            page = await client.getByUID('custom_page', uid, {
                lang: locale
            });
        } catch (error) {
            try {
                page = await client.getByUID('custom_page', uid);
            } catch {}
        }

        return {
            props: {
                page,
                countries: await CountriesApi({
                    locale
                }),
                analytics: {
                    pageType: AnalyticsPageType.page
                }
            },
            revalidate: 60
        };
    } catch (error) {
        if (error.message?.includes('No documents')) {
            return {
                notFound: true
            };
        }

        captureException(error);
        return {
            props: {},
            revalidate: 1
        };
    }
}

export default CountriesPage;

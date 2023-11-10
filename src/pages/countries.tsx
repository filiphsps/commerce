import styled, { css } from 'styled-components';

import { CountriesApi } from '@/api/store';
import Breadcrumbs from '@/components/Breadcrumbs';
import type { StoreModel } from '@/models/StoreModel';
import { createClient } from '@/prismic';
import type { CustomPageDocument } from '@/prismic/types';
import { components } from '@/slices';
import { Config } from '@/utils/Config';
import { asText } from '@prismicio/client';
import { SliceZone } from '@prismicio/react';
import { AnalyticsPageType } from '@shopify/hydrogen-react';
import type { Country } from '@shopify/hydrogen-react/storefront-api-types';
import type { GetStaticProps } from 'next';
import { useTranslation } from 'next-i18next';
import { NextSeo } from 'next-seo';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/router';
import type { FunctionComponent } from 'react';
import useSWR from 'swr';

const Page = dynamic(() => import('@/components/Page'));
const PageContent = dynamic(() => import('@/components/PageContent'));
const PageHeader = dynamic(() => import('@/components/PageHeader'));

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

    @media (hover: hover) and (pointer: fine) {
        &:hover {
            border-color: var(--accent-secondary);
            background: var(--accent-secondary-light);
            color: var(--accent-secondary-text);
        }
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
const CountriesPage: FunctionComponent<CountriesPageProps> = ({ page, countries: countriesData, store }) => {
    const router = useRouter();
    const { i18n } = useTranslation('common');

    const { data: countries } = useSWR(
        [
            'CountriesApi',
            {
                locale: router.locale
            }
        ],
        ([, props]) => CountriesApi(props),
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
                title={page?.data.meta_title || page?.data.title!}
                description={
                    (page?.data?.meta_description && asText(page?.data.meta_description)) ||
                    page?.data?.description! ||
                    ''
                }
                canonical={`https://${Config.domain}/${router.locale}/countries/`}
                languageAlternates={
                    router.locales?.map((locale) => ({
                        hrefLang: locale,
                        href: `https://${Config.domain}/${(locale !== 'x-default' && `${locale}/`) || ''}locales/`
                    })) || []
                }
                openGraph={{
                    url: `https://${Config.domain}${router.locale}/countries/`,
                    type: 'website',
                    title: page?.data.meta_title || page?.data.title!,
                    description:
                        (page?.data.meta_description && asText(page.data.meta_description)) ||
                        page?.data.description ||
                        '',
                    siteName: store?.name,
                    locale: (router.locale !== 'x-default' && router.locale) || Config.i18n.default,
                    images:
                        (page?.data?.meta_image && [
                            {
                                url: page?.data?.meta_image!.url as string,
                                width: page?.data?.meta_image!.dimensions?.width || 0,
                                height: page?.data?.meta_image!.dimensions?.height || 0,
                                alt: page?.data?.meta_image!.alt || '',
                                secureUrl: page?.data?.meta_image!.url as string
                            }
                        ]) ||
                        undefined
                }}
            />

            <PageContent primary>
                <PageContent>
                    <PageHeader title={page?.data.title} subtitle={page?.data.description} />

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
                                                await i18n.changeLanguage(locale.locale.split('-').at(0));
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
                            title: page?.data.title,
                            url: '/countries/'
                        }
                    ]}
                    store={store}
                />
            </PageContent>
        </Page>
    );
};

export const getStaticProps: GetStaticProps = async ({ locale, previewData }) => {
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
    } catch (error: any) {
        if (error.message?.includes('No documents')) {
            return {
                notFound: true,
                revalidate: false
            };
        }

        console.error(error);
        return {
            props: {},
            revalidate: 1
        };
    }
};

export default CountriesPage;

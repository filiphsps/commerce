import * as Sentry from '@sentry/nextjs';

import React, { FunctionComponent } from 'react';

import { Config } from '../src/util/Config';
import { CustomPageDocument } from '../prismicio-types';
import Error from 'next/error';
import { NextSeo } from 'next-seo';
import Page from '../src/components/Page';
import { Prefetch } from '../src/util/Prefetch';
import { SliceZone } from '@prismicio/react';
import type { StoreModel } from '../src/models/StoreModel';
import { asText } from '@prismicio/client';
import { components } from '../slices';
import { createClient } from '../prismicio';
import { useRouter } from 'next/router';

interface HomePageProps {
    store: StoreModel;
    prefetch: any;
    page: CustomPageDocument<string>;
    error?: string;
}
const HomePage: FunctionComponent<HomePageProps> = (props) => {
    const router = useRouter();
    const { store, page, prefetch, error } = props;

    if (!store || !page) return <Error statusCode={500} title={error} />;

    return (
        <Page className="HomePage">
            <NextSeo
                title={page.data.meta_title || ''}
                description={asText(page.data.meta_description) || store?.description || ''}
                canonical={`https://${Config.domain}/${router.locale}/`}
                languageAlternates={
                    router?.locales
                        ?.filter((locale) => locale !== 'x-default')
                        .map((locale) => ({
                            hrefLang: locale,
                            href: `https://${Config.domain}/${locale}/`
                        })) || []
                }
                additionalMetaTags={
                    (page.data.keywords && [
                        {
                            property: 'keywords',
                            content: page.data.keywords
                        }
                    ]) ||
                    []
                }
            />
            <SliceZone
                slices={page.data.slices}
                components={components}
                context={{ prefetch, store }}
            />
        </Page>
    );
};

export async function getStaticProps({ locale, locales, query, previewData }) {
    const client = createClient({ previewData });
    let page: any = null;
    try {
        page = await client.getByUID('custom_page', 'homepage', {
            lang: (locale !== 'x-default' && locale) || locales[1]
        });
    } catch {
        try {
            page = await client.getByUID('custom_page', 'homepage');
        } catch (error) {
            Sentry.captureException(error);
            return {
                props: {
                    error: error.message
                },
                revalidate: 10
            };
        }
    }

    const prefetch = page && (await Prefetch(page, query, locale));

    return {
        props: {
            page,
            prefetch,
            analytics: {
                pageType: 'index'
            }
        },
        revalidate: 60
    };
}

export default HomePage;

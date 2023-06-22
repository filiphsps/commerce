import React, { FunctionComponent } from 'react';

import { Config } from '../src/util/Config';
import { CustomPageDocument } from '../prismicio-types';
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
}
const HomePage: FunctionComponent<HomePageProps> = (props) => {
    const router = useRouter();
    const { store, page, prefetch } = props;

    return (
        <Page className="HomePage">
            <NextSeo
                title={page.data.meta_title || ''}
                description={asText(page.data.meta_description) || store?.description || ''}
                canonical={`https://${Config.domain}/`}
                languageAlternates={
                    router?.locales
                        ?.filter((locale) => locale !== '__default')
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

export async function getStaticProps({ locale, query, previewData }) {
    const client = createClient({ previewData });
    let page: any = null;
    try {
        page = await client.getByUID('custom_page', 'homepage', {
            lang: locale
        });
    } catch {
        page = await client.getByUID('custom_page', 'homepage');
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
        revalidate: 10
    };
}

export default HomePage;

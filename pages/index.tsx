import React, { FunctionComponent } from 'react';

import { Config } from '../src/util/Config';
import { NextSeo } from 'next-seo';
import Page from '../src/components/Page';
import { PageApi } from '../src/api/page';
import type { PageModel } from '../src/models/PageModel';
import { Prefetch } from '../src/util/Prefetch';
import Slices from '../src/components/Slices';
import type { StoreModel } from '../src/models/StoreModel';

interface HomePageProps {
    store: StoreModel;
    data: {
        page: PageModel;
        prefetch: any;
    };
}
const HomePage: FunctionComponent<HomePageProps> = (props) => {
    const { store, data } = props;

    return (
        <Page className="HomePage">
            <NextSeo
                title={data?.page?.title}
                description={data?.page?.description || store?.description || ''}
                canonical={`https://${Config.domain}/`}
                additionalMetaTags={
                    data?.page?.keywords
                        ? [
                              {
                                  property: 'keywords',
                                  content: data?.page?.keywords
                              }
                          ]
                        : []
                }
            />
            <Slices store={store} data={data?.page?.body} prefetch={data?.prefetch} />
        </Page>
    );
};

export async function getStaticProps({ query, locale }) {
    const page = await PageApi('home', locale);
    const prefetch = page && (await Prefetch(page, query));

    return {
        props: {
            data: {
                page,
                prefetch
            },
            analytics: {
                pageType: 'index'
            }
        },
        revalidate: 10
    };
}

export default HomePage;

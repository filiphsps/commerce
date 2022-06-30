import { NextSeo } from 'next-seo';
import Page from '../src/components/Page';
import { PageApi } from '../src/api/page';
import { Prefetch } from '../src/util/Prefetch';
import React from 'react';
import Slices from '../src/components/Slices';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

const HomePage = (props: any) => {
    const { store, data } = props;

    return (
        <Page className="HomePage">
            <NextSeo
                title={data?.page?.title}
                description={
                    data?.page?.description || store?.description || ''
                }
            />
            <Slices
                store={store}
                data={data?.page?.body}
                prefetch={data?.prefetch}
            />
        </Page>
    );
};

export async function getStaticProps({ query, locale }) {
    const page = (await PageApi('home', locale)) as any;
    const prefetch = page && (await Prefetch(page, query));

    return {
        props: {
            ...(await serverSideTranslations(locale, ['common', 'product'])),
            data: {
                page,
                prefetch
            }
        },
        revalidate: 1
    };
}

export default HomePage;

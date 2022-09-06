import { useCallback, useEffect, useState } from 'react';

import Breadcrumbs from '../../src/components/Breadcrumbs';
import CollectionBlock from '../../src/components/CollectionBlock';
import { Config } from '../../src/util/Config';
import Head from 'next/head';
import Input from '../../src/components/Input';
import LanguageString from '../../src/components/LanguageString';
import { NextSeo } from 'next-seo';
import Page from '../../src/components/Page';
import PageContent from '../../src/components/PageContent';
import PageHeader from '../../src/components/PageHeader';
import PageLoader from '../../src/components/PageLoader';
import { SearchApi } from '../../src/api/search';
import styled from 'styled-components';
import { useRouter } from 'next/router';

const InputWrapper = styled.div`
    text-transform: uppercase;
    input {
        padding: 1rem;
        height: 3rem;
        width: 100%;
    }
`;

const SearchPage = (props: any) => {
    const { store } = props;
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState([]);
    const router = useRouter();
    const q = (
        Array.isArray(router.query.q) ? router.query.q[0] : router.query.q
    ) as string;
    const [query, setQuery] = useState(q?.length ? q : '');

    const search = useCallback(async () => {
        if (query === '') return setItems([]);

        setLoading(true);
        setItems(await SearchApi(query));
        return setLoading(false);
    }, [query]);

    useEffect(() => {
        search();
    }, []);
    useEffect(() => {
        search();
    }, [router.query]);

    return (
        <Page className="SearchPage">
            <NextSeo title="Search" />
            <Head>
                <link
                    rel="canonical"
                    href={`https://${Config.domain}/search/`}
                />
            </Head>

            <PageContent>
                <Breadcrumbs
                    store={store}
                    pages={[
                        {
                            title: <LanguageString id={'search'} />,
                            url: '/search'
                        }
                    ]}
                />

                <PageHeader title="Search" />

                <InputWrapper>
                    <Input
                        placeholder={'search...'}
                        spellCheck={false}
                        defaultValue={router.query.q ?? null}
                        onChange={async (e) => {
                            const phrase = e?.target?.value || '';
                            setQuery(phrase);
                            search();
                        }}
                    />
                </InputWrapper>

                {!loading && items.length > 0 && (
                    <CollectionBlock
                        data={{
                            items: items
                        }}
                    />
                )}
                {loading ? <PageLoader /> : null}
            </PageContent>
        </Page>
    );
};

export async function getStaticProps() {
    return {
        props: {},
        revalidate: 10
    };
}

export default SearchPage;

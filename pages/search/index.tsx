import Page from '../../src/components/Page';
import Breadcrumbs from '../../src/components/Breadcrumbs';
import PageContent from '../../src/components/PageContent';
import LanguageString from '../../src/components/LanguageString';
import Input from '../../src/components/Input';
import { useState } from 'react';
import fetcher from '../../src/api/fetcher';

import CollectionBlock from '../../src/components/CollectionBlock';

const SearchPage = (props: any) => {
    const { store } = props;
    const [items, setItems] = useState(null);

    return (
        <Page className="SearchPage">
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

                <Input
                    placeholder={'search...'}
                    spellCheck={false}
                    onChange={async (e) => {
                        const phrase = e?.target?.value || '';
                        const res = await fetcher('/search', {
                            query: phrase
                        });

                        setItems({
                            items: res?.products?.map((product) => {
                                return product?.handle || '';
                            })
                        });
                    }}
                    store={store}
                />

                {items && <CollectionBlock data={items} />}
            </PageContent>
        </Page>
    );
};

export async function getStaticProps({ query }) {
    return {
        props: {},
        revalidate: 1
    };
}

export default SearchPage;

import Breadcrumbs from '../../src/components/Breadcrumbs';
import CollectionBlock from '../../src/components/CollectionBlock';
import Input from '../../src/components/Input';
import LanguageString from '../../src/components/LanguageString';
import Page from '../../src/components/Page';
import PageContent from '../../src/components/PageContent';
import fetcher from '../../src/api/fetcher';
import { useState } from 'react';

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
                />

                {items && <CollectionBlock data={items} />}
            </PageContent>
        </Page>
    );
};

export async function getStaticProps() {
    return {
        props: {},
        revalidate: 1
    };
}

export default SearchPage;

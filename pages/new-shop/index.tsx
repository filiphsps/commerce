import Breadcrumbs from '../../src/components/Breadcrumbs';
import LanguageString from '../../src/components/LanguageString';
import Page from '../../src/components/Page';
import PageContent from '../../src/components/PageContent';
import { ProductsApi } from '../../src/api';
import ShopBlock from '../../src/components/ShopBlock';

const ShopPage = (props: any) => {
    const { store, data } = props;

    return (
        <Page>
            <PageContent>
                <Breadcrumbs
                    store={store}
                    pages={[
                        {
                            title: <LanguageString id={'shop'} />,
                            url: '/shop'
                        }
                    ]}
                />

                <ShopBlock data={data?.products} />
            </PageContent>
        </Page>
    );
};

export async function getStaticProps() {
    try {
        const products = ((await ProductsApi()) as any) ?? null;

        return {
            props: {
                data: {
                    products
                }
            },
            revalidate: 1
        };
    } catch (error) {
        return {
            props: {},
            revalidate: 1
        };
    }
}

export default ShopPage;

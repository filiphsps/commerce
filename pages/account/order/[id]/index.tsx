import React, { useEffect, useState } from 'react';

import Breadcrumbs from '../../../../src/components/Breadcrumbs';
import Button from '../../../../src/components/Button';
import Head from 'next/head';
import LanguageString from '../../../../src/components/LanguageString';
import { OrderApi } from '../../../../src/api/orders';
import OrderLineItems from '../../../../src/components/OrderLineItems';
import Page from '../../../../src/components/Page';
import PageContent from '../../../../src/components/PageContent';
import PageHeader from '../../../../src/components/PageHeader';
import { useRouter } from 'next/router';

const OrderPage = (props: any) => {
    const { store } = props;
    const router = useRouter();
    const [order, setOrder] = useState(null);

    useEffect(() => {
        OrderApi(router?.query?.id as string).then(setOrder);
    }, [router?.query?.id]);

    return (
        <Page className="OrderPage">
            <Head>
                <title>
                    #{router?.query?.id} | {store?.name}
                </title>
            </Head>

            <PageContent>
                <Breadcrumbs
                    pages={[
                        {
                            title: <LanguageString id={'account'} />,
                            url: '/account'
                        },
                        {
                            title: router?.query?.id || (
                                <LanguageString id={'order'} />
                            ),
                            url: `/account/order/${router?.query?.id}`
                        }
                    ]}
                    store={store}
                />

                {/*<PageHeader
                    title={
                        <>
                            <LanguageString id={'order'} />
                            {` #${router?.query?.id}`}
                        </>
                    }
                    action={
                        order && (
                            <>
                                {order?.payment_status} / {order?.status}
                            </>
                        )
                    }
                />*/}

                <div className="OrderPage-Content">
                    <OrderLineItems data={order?.line_items} />

                    <div className="OrderPage-Content-Meta">
                        <Button>
                            <LanguageString id={'order_again'} />
                        </Button>
                    </div>
                </div>
            </PageContent>
        </Page>
    );
};

export default OrderPage;

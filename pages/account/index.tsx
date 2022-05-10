import React, { useEffect, useState } from 'react';

import Breadcrumbs from '../../src/components/Breadcrumbs';
import { CustomerApi } from '../../src/api';
import Head from 'next/head';
import LanguageString from '../../src/components/LanguageString';
import OrdersBlock from '../../src/components/OrdersBlock';
import Page from '../../src/components/Page';
import PageContent from '../../src/components/PageContent';
import PageHeader from '../../src/components/PageHeader';
import { RemoveToken } from '../../src/util/customer/token';
import moment from 'moment';
import { useRouter } from 'next/router';

const AccountPage = (props: any) => {
    const { store } = props;
    const router = useRouter();
    const [customer, setCustomer] = useState(null);

    useEffect(() => {
        CustomerApi()
            .then((customer) => {
                setCustomer(customer);
            })
            .catch(() => {
                router.replace('/account/login');
            });
    }, []);

    return (
        <Page className="AccountPage">
            <Head>
                <title>Account | {store?.name}</title>
            </Head>

            <PageContent>
                <Breadcrumbs
                    pages={[
                        {
                            title: <LanguageString id={'account'} />,
                            url: '/account'
                        }
                    ]}
                    store={store}
                />

                <PageHeader
                    title={<LanguageString id={'account'} />}
                    action={
                        <div
                            className="AccountPage-Header-Action"
                            onClick={async () => {
                                await RemoveToken();
                                await router.push('/account/login');
                            }}
                        >
                            <LanguageString id={'logout'} />
                        </div>
                    }
                />

                <div className="AccountPage-Content">
                    <OrdersBlock />
                    <div className="AccountPage-Content-Meta">
                        <div className="AccountPage-Content-Meta-Name">
                            {customer?.displayName}
                        </div>
                        <div className="AccountPage-Content-Meta-Date">
                            <LanguageString id={'customer_since'} />{' '}
                            {moment(customer?.createdAt).format(
                                'MMMM Do, YYYY'
                            )}
                        </div>

                        <div className="AccountPage-Content-Meta-Address">
                            <div>{customer?.defaultAddress?.address1}</div>
                            <div>{customer?.defaultAddress?.address2}</div>
                            <div>
                                {customer?.defaultAddress?.city}{' '}
                                {customer?.defaultAddress?.zip}
                            </div>
                            <div>{customer?.defaultAddress?.country}</div>
                        </div>
                    </div>
                </div>
            </PageContent>
        </Page>
    );
};

export default AccountPage;

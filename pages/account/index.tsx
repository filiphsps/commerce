import React, { useEffect, useState } from 'react';

import Breadcrumbs from '../../src/components/Breadcrumbs';
import { CustomerApi } from '../../src/api/customer';
import { NextSeo } from 'next-seo';
import OrdersBlock from '../../src/components/OrdersBlock';
import Page from '../../src/components/Page';
import PageContent from '../../src/components/PageContent';
import PageHeader from '../../src/components/PageHeader';
import { RemoveToken } from '../../src/util/customer/token';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';

const AccountPage = (props: any) => {
    const { store } = props;
    const router = useRouter();
    const [customer, setCustomer] = useState(null);
    const { t } = useTranslation('product');

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
            <NextSeo title="Account" />

            <PageContent>
                <Breadcrumbs
                    pages={[
                        {
                            title: t('account'),
                            url: '/account'
                        }
                    ]}
                    store={store}
                />

                {/*<PageHeader
                    title={t('account')}
                    action={
                        <div
                            className="AccountPage-Header-Action"
                            onClick={async () => {
                                await RemoveToken();
                                await router.push('/account/login');
                            }}
                        >
                            {t('logout')}
                        </div>
                    }
                />*/}

                <div className="AccountPage-Content">
                    <OrdersBlock />
                    <div className="AccountPage-Content-Meta">
                        <div className="AccountPage-Content-Meta-Name">
                            {customer?.displayName}
                        </div>
                        <div className="AccountPage-Content-Meta-Date">
                            Customer since{' '}
                            {new Date(
                                Date.parse(customer?.createdAt)
                            ).toLocaleDateString()}
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

export async function getStaticProps({ locale }) {
    return {
        props: {
            ...(await serverSideTranslations(locale, ['common', 'product']))
        },
        revalidate: false
    };
}

export default AccountPage;

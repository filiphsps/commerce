import { CustomerApi, CustomerRecoverApi } from '../../../src/api';
import React, { useEffect, useState } from 'react';

import Breadcrumbs from '../../../src/components/Breadcrumbs';
import Button from '../../../src/components/Button';
import Head from 'next/head';
import Input from '../../../src/components/Input';
import LanguageString from '../../../src/components/LanguageString';
import Link from '../../../src/components/Link';
import Page from '../../../src/components/Page';
import PageContent from '../../../src/components/PageContent';
import PageHeader from '../../../src/components/PageHeader';
import { StoreToken } from '../../../src/util/customer/token';
import { useRouter } from 'next/router';

const AccountLoginPage = (props: any) => {
    const { store } = props;
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');

    useEffect(() => {
        CustomerApi().then(() => {
            router.replace('/account');
        });
    }, []);

    return (
        <Page className="AccountLoginPage">
            <Head>
                <title>Reset Password | {store?.name}</title>
            </Head>

            <PageContent className="AccountLoginPage-Container">
                <Breadcrumbs
                    pages={[
                        {
                            title: <LanguageString id={'account'} />,
                            url: '/account'
                        },
                        {
                            title: <LanguageString id={'recover'} />,
                            url: '/account/recover'
                        }
                    ]}
                    store={store}
                />

                <PageHeader title={<LanguageString id={'forgot_password'} />} />

                <div className="AccountLoginPage-Container-Box">
                    <Input
                        placeholder="email"
                        type="email"
                        onChange={(e) => setEmail(e.target.value)}
                        value={email}
                    />
                    <Button
                        disabled={loading || !email}
                        onClick={async () => {
                            try {
                                setLoading(true);

                                await CustomerRecoverApi(email);
                                router.push('/account/login');
                            } catch (err) {
                                console.error(err);
                            } finally {
                                setLoading(false);
                            }
                        }}
                    >
                        <LanguageString
                            id={(loading && 'loading') || 'reset'}
                        />
                    </Button>
                    <Link to={'/account/login'}>
                        <LanguageString id={'login'} />
                    </Link>
                </div>
            </PageContent>
        </Page>
    );
};

export default AccountLoginPage;

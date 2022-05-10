import React, { useState } from 'react';

import Breadcrumbs from '../../../src/components/Breadcrumbs';
import Button from '../../../src/components/Button';
import { CustomerRegisterApi } from '../../../src/api';
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
    const [email, setEmail] = useState();
    const [password, setPassword] = useState();

    return (
        <Page className="AccountLoginPage">
            <Head>
                <title>Register | {store?.name}</title>
            </Head>

            <PageContent className="AccountLoginPage-Container">
                <Breadcrumbs
                    pages={[
                        {
                            title: <LanguageString id={'account'} />,
                            url: '/account'
                        },
                        {
                            title: <LanguageString id={'register'} />,
                            url: '/account/register'
                        }
                    ]}
                    store={store}
                />

                <PageHeader title={<LanguageString id={'register'} />} />

                <div className="AccountLoginPage-Container-Box">
                    <Input
                        placeholder="email"
                        type="email"
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <Input
                        placeholder="password"
                        type="password"
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button
                        disabled={loading || !email || !password}
                        onClick={async () => {
                            try {
                                setLoading(true);

                                await CustomerRegisterApi({ email, password });
                                router.push('/account/login');
                            } catch (err) {
                                console.error(err);
                            } finally {
                                setLoading(false);
                            }
                        }}
                    >
                        <LanguageString
                            id={(loading && 'loading') || 'register'}
                        />
                    </Button>
                    <Link to={'/account/login'}>
                        <LanguageString id={'login'} />
                    </Link>
                    <Link to={'/account/reset'}>
                        <LanguageString id={'forgot_password'} />
                    </Link>
                </div>
            </PageContent>
        </Page>
    );
};

export default AccountLoginPage;

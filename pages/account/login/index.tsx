import { CustomerApi, CustomerLoginApi } from '../../../src/api/customer';
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
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        CustomerApi().then(() => {
            router.replace('/account');
        });
    }, []);

    return (
        <Page className="AccountLoginPage">
            <Head>
                <title>Login | {store?.name}</title>
            </Head>

            <PageContent className="AccountLoginPage-Container">
                <Breadcrumbs
                    pages={[
                        {
                            title: <LanguageString id={'account'} />,
                            url: '/account'
                        },
                        {
                            title: <LanguageString id={'login'} />,
                            url: '/account/login'
                        }
                    ]}
                    store={store}
                />

                <PageHeader title={<LanguageString id={'login'} />} />

                <div className="AccountLoginPage-Container-Box">
                    {error && (
                        <div className="AccountLoginPage-Container-Box-Error">
                            <LanguageString id={error} />
                        </div>
                    )}
                    <form>
                        <Input
                            placeholder="email"
                            type="email"
                            onChange={(e) => setEmail(e.target.value)}
                            value={email}
                        />
                        <Input
                            placeholder="password"
                            type="password"
                            onChange={(e) => setPassword(e.target.value)}
                            value={password}
                        />
                        <Button
                            className="Button"
                            type="submit"
                            disabled={loading || !email || !password}
                            onClick={async () => {
                                try {
                                    setLoading(true);
                                    setError(null);

                                    const token = await CustomerLoginApi({
                                        email,
                                        password
                                    });
                                    await StoreToken(token);

                                    router.push('/account');
                                } catch (err) {
                                    setError(`error_${err?.[0]?.code}`);
                                    console.error(err);
                                } finally {
                                    setLoading(false);
                                }
                            }}
                        >
                            <LanguageString
                                id={(loading && 'loading') || 'login'}
                            />
                        </Button>
                    </form>
                    {/*<Link to={'/account/register'}>
                        <LanguageString id={'create_account'} />
                    </Link>*/}
                    <Link to={'/account/recover'}>
                        <LanguageString id={'forgot_password'} />
                    </Link>
                </div>
            </PageContent>
        </Page>
    );
};

export default AccountLoginPage;

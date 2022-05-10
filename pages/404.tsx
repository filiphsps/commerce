import Head from 'next/head';
import Page from '../src/components/Page';

const Error404 = (props) => {
    const { store } = props;

    return (
        <Page className="ErrorPage">
            <Head>
                <title>Error 404 | {store?.name}</title>
            </Head>

            <h1>Error 404</h1>
            <h2>This page could not be found.</h2>
        </Page>
    );
};

export default Error404;

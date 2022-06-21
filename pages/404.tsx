import Head from 'next/head';
import { NextSeo } from 'next-seo';
import Page from '../src/components/Page';

const Error404 = (props) => {
    const { store } = props;

    return (
        <Page className="ErrorPage">
            <NextSeo title="Error 404" />

            <h1>Error 404</h1>
            <h2>This page could not be found.</h2>
        </Page>
    );
};

export default Error404;

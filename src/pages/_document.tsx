import NextDocument, { Head, Html, Main, NextScript } from 'next/document';

import { Config } from '@/utils/Config';
import type { DocumentContext } from 'next/document';
import Script from 'next/script';
import { ServerStyleSheet } from 'styled-components';

class Document extends NextDocument {
    static async getInitialProps(ctx: DocumentContext) {
        const sheet = new ServerStyleSheet();
        const originalRenderPage = ctx.renderPage;

        try {
            ctx.renderPage = () =>
                originalRenderPage({
                    enhanceApp: (App) => (props) => sheet.collectStyles(<App {...props} />)
                });

            const initialProps = await NextDocument.getInitialProps(ctx);
            return {
                ...initialProps,
                styles: (
                    <>
                        {initialProps.styles}
                        {sheet.getStyleElement()}
                    </>
                )
            };
        } finally {
            sheet.seal();
        }
    }

    render() {
        return (
            <Html lang={(this.props.locale && this.props.locale !== 'x-default' && this.props.locale) || undefined}>
                <Head>
                    <link rel="preconnect" href="https://cdn.shopify.com" crossOrigin="" />
                    <link rel="preconnect" href="https://images.prismic.io" crossOrigin="" />
                    <link rel="preconnect" href={`https://${Config.shopify.checkout_domain}`} />
                    <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
                </Head>
                <body>
                    <Main />
                    <NextScript />

                    {Config.GTM && process.env.NODE_ENV !== 'development' && (
                        <Script id="gtm" strategy="afterInteractive">
                            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                            })(window,document,'script','dataLayer','${Config.GTM}');`}
                        </Script>
                    )}
                </body>
            </Html>
        );
    }
}

export default Document;

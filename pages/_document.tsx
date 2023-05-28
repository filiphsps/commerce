import Document, { Head, Html, Main, NextScript } from 'next/document';

import { Config } from '../src/util/Config';
import Script from 'next/script';
import { ServerStyleSheet } from 'styled-components';

class App extends Document {
    static async getInitialProps(ctx) {
        const sheet = new ServerStyleSheet();
        const originalRenderPage = ctx.renderPage;

        try {
            ctx.renderPage = () =>
                originalRenderPage({
                    enhanceApp: (App) => (props) =>
                        sheet.collectStyles(<App {...props} />)
                });

            const initialProps = await Document.getInitialProps(ctx);
            return {
                ...initialProps,
                styles: (
                    <>
                        {initialProps.styles}
                        {sheet.getStyleElement()}
                    </>
                )
            } as any;
        } finally {
            sheet.seal();
        }
    }

    render() {
        return (
            <Html lang={this.props.locale || Config.i18n.locales[0]}>
                <Head>
                    <link
                        rel="preconnect"
                        href="https://fonts.googleapis.com"
                    />
                    <link
                        rel="preconnect"
                        href="https://fonts.gstatic.com"
                        crossOrigin=""
                    />
                    <link
                        rel="preconnect"
                        href="https://cdn.shopify.com"
                        crossOrigin=""
                    />
                    <link
                        rel="preconnect"
                        href="https://sweet-side-of-sweden.myshopify.com/"
                        crossOrigin=""
                    />
                    <link
                        href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;800&display=swap"
                        rel="stylesheet"
                    />
                </Head>
                <body itemScope itemType="http://schema.org/WebPage">
                    <Main />
                    <NextScript />
                    {Config.GTM && (
                        <Script id="gtm" strategy="lazyOnload">
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

export default App;

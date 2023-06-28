import NextDocument, { Head, Html, Main, NextScript } from 'next/document';

import { Config } from '../src/util/Config';
import Script from 'next/script';
import { ServerStyleSheet } from 'styled-components';

class Document extends NextDocument {
    static async getInitialProps(ctx) {
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
            } as any;
        } finally {
            sheet.seal();
        }
    }

    render() {
        return (
            <Html
                lang={
                    (this.props.locale !== 'x-default' &&
                        (this.props.locale || Config.i18n.locales[0])) ||
                    undefined
                }
            >
                <Head>
                    <link rel="preconnect" href="https://fonts.googleapis.com" />
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                    <link rel="preconnect" href="https://cdn.shopify.com" crossOrigin="" />
                    <link
                        rel="preconnect"
                        href="https://sweet-side-of-sweden.myshopify.com/"
                        crossOrigin=""
                    />
                    <link
                        href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap"
                        rel="stylesheet"
                    />
                    <link
                        rel="stylesheet"
                        type="text/css"
                        href="https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.6.0/slick.min.css"
                    />
                    <link
                        rel="stylesheet"
                        type="text/css"
                        href="https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.6.0/slick-theme.min.css"
                    />
                </Head>
                <body itemScope itemType="http://schema.org/WebPage">
                    <Main />
                    <NextScript />

                    {Config.GTM && (
                        <Script id="gtm" strategy="afterInteractive">
                            {`// Originally adapted from https://www.sean-lloyd.com/post/delay-google-analytics-improve-pagespeed-insights-score/
                            // TODO: Turn this into an actual package.

                            // Initializes Google Tag Manager
                            let ran = false;
                            function initGTM () {
                                if(ran) return;
                                ran = true;
                                
                                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                                })(window,document,'script','dataLayer','${Config.GTM}');
                            }

                            // Load the script after the user scrolls, moves the mouse, or touches the screen
                            document.addEventListener('scroll', initGTMOnEvent);
                            document.addEventListener('click', initGTMOnEvent);
                            document.addEventListener('touchstart', initGTMOnEvent);

                            // Initializes Google Tag Manager in response to an event
                            function initGTMOnEvent (event) {
                                initGTM();
                                document.removeEventListener('scroll', initGTMOnEvent);
                                document.removeEventListener('click', initGTMOnEvent);
                                document.removeEventListener('touchstart', initGTMOnEvent);
                            }
                            
                            // Backup options
                            if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
                                setTimeout(initGTM, 10000);
                            else
                                setTimeout(initGTM, 5000);`}
                        </Script>
                    )}
                </body>
            </Html>
        );
    }
}

export default Document;

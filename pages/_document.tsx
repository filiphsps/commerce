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
                    enhanceApp: (App) => (props) => sheet.collectStyles(<App {...props} />)
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
                    <link rel="preconnect" href="https://fonts.googleapis.com" />
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                    <link rel="preconnect" href="https://cdn.shopify.com" crossOrigin="" />
                    <link
                        rel="preconnect"
                        href="https://sweet-side-of-sweden.myshopify.com/"
                        crossOrigin=""
                    />
                    <link
                        href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;800&display=swap"
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
                        <Script id="gtm" strategy="lazyOnload">
                            {`
                            // Adapted from https://www.sean-lloyd.com/post/delay-google-analytics-improve-pagespeed-insights-score/

                            // Load the script after the user scrolls, moves the mouse, or touches the screen
                            document.addEventListener('scroll', initGTMOnEvent);
                            document.addEventListener('mousemove', initGTMOnEvent);
                            document.addEventListener('touchstart', initGTMOnEvent);
                            
                            // Or, load the script after 2 seconds
                            document.addEventListener('DOMContentLoaded', () => { setTimeout(initGTM, 2000); });
                            
                            // Initializes Google Tag Manager in response to an event
                            function initGTMOnEvent (event) {
                                initGTM();
                                event.currentTarget.removeEventListener(event.type, initGTMOnEvent);
                            }
                            
                            // Initializes Google Tag Manager
                            function initGTM () {
                                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                                })(window,document,'script','dataLayer','${Config.GTM}');

                                console.log("Delayed!");
                            }
                        
                        `}
                        </Script>
                    )}
                </body>
            </Html>
        );
    }
}

export default App;

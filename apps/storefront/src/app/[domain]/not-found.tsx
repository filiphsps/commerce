import '@/styles/app.scss';
import '../globals.css';

import { Content } from '@/components/typography/content';
import Heading from '@/components/typography/heading';

import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: '404: Page Not Found',
    icons: {
        icon: ['/favicon.png'],
        shortcut: ['/favicon.png'],
        apple: ['/favicon.png']
    },
    robots: {
        index: false,
        follow: false
    },
    referrer: 'origin'
};

export default async function NotFound() {
    return (
        <html lang="en">
            <head>
                <meta httpEquiv="refresh" content={`5; url=/en-US/countries/`} />
            </head>

            <body className="p-3">
                <Heading title="Page not found" subtitle="Error 404" subtitleAs="h2" />

                <Content>
                    <p>Sorry we could not find a page in the language or region you requested.</p>
                    <p>
                        You&apos;ll be redirected to the default language and region in a few seconds. If you are not
                        redirected automatically, please click <a href="/en-US/countries/">here</a>.
                    </p>
                </Content>
            </body>
        </html>
    );
}

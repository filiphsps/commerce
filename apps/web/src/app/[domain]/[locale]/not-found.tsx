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

export default function NotFound() {
    return (
        <>
            <Heading title="Page not found" subtitle="Error 404" subtitleAs="h2" />

            <Content>
                <p>Sorry, we could not find the page you were looking for.</p>
                <p>
                    Are you sure you typed the correct URL?
                    <br />
                    If you followed a link from another site,
                    <br />
                    please let them know one of their links are broken.
                    <br />
                    <br />
                    Or if you think this is a mistake,
                    <br />
                    please reach out to our support.
                </p>
            </Content>
        </>
    );
}

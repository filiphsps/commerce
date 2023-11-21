import { Page } from '@/components/layout/page';
import PageContent from '@/components/page-content';
import { Content } from '@/components/typography/content';
import Heading from '@/components/typography/heading';
import type { Metadata } from 'next';

/* c8 ignore start */
export const metadata: Metadata = {
    title: '404: Page Not Found',
    icons: {
        icon: ['/favicon.png', '/favicon.ico'],
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
        <Page>
            <PageContent primary>
                <Heading title="Error 404" subtitle="Page not found" />

                <Content>
                    <p>Sorry, we could not find the page you were looking for.</p>
                    <p>
                        Are you sure you typed the correct URL?
                        <br />
                        If you followed a link from another site,
                        <br />
                        please let them know one their links are broken.
                        <br />
                        <br />
                        Or if you think this is a mistake,
                        <br />
                        please reach out to our support.
                    </p>
                </Content>
            </PageContent>
        </Page>
    );
}
/* c8 ignore stop */

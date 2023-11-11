import Page from '@/components/Page';
import PageContent from '@/components/PageContent';
import Heading from '@/components/typography/heading';
import type { Metadata } from 'next';

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
                <Heading title="Error 404" subtitle="Page not found :(" />
            </PageContent>
        </Page>
    );
}

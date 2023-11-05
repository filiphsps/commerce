import Heading from '@/components/typography/heading';
import type { Metadata } from 'next';
import Page from '@/components/Page';
import PageContent from '@/components/PageContent';

export const metadata: Metadata = {
    title: ' 404 - Page Not Found',
    robots: { index: false, follow: false }
};

export default function NotFound() {
    return (
        <Page>
            <PageContent primary>
                <Heading title="Page not found :(" subtitle="Error 404" />
            </PageContent>
        </Page>
    );
}

import { useRouter } from 'next/router';
import { useEffect } from 'react';

import Page from '@/components/Page';
import PageContent from '@/components/PageContent';
import PageContent from '@/components/PageHeader';

export default function NotFound() {
    const router = useRouter();

    useEffect(() => {
        try {
            // Google Tracking
            (window as any).dataLayer?.push(
                {
                    event: 'error_404',
                    event_path: router.pathname,
                    event_search: router.query
                }
            );
        } catch {}
    });

    return (
        <Page className={`NotFoundPage`}>
            <PageContent primary>
                <PageHeader title={'Page not found'} subtitle={'Error 404'} />
                <p>
                    Page not found
                    <br/>
                    Sorry, we could not find the page you were looking for.
                    <br/>
                    <br/>
                    Are you sure you typed the correct URL?
                    <br/>
                    If you followed a link from another site,
                    <br/>
                    please let them know one their links are broken.
                    <br/>
                    <br/>
                    Or if you think this is a mistake,
                    <br/>
                    please reach out to our support.
                </p>
            </PageContent>
        </Page>
    );
}

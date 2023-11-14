'use client';

/* c8 ignore start */
import Content from '@/components/Content/Content';
import Page from '@/components/Page';
import PageContent from '@/components/PageContent';
import Heading from '@/components/typography/heading';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => console.error(error), [error]);
    return (
        <Page>
            <PageContent primary>
                <Heading title={`Error: ${error?.name}`} subtitle={`${error.message}`} />

                <Content>
                    <p>If this keeps happening please reach out to our support.</p>
                    <button onClick={reset}>Are you ready to try again?</button>
                </Content>
            </PageContent>
        </Page>
    );
}
/* c8 ignore stop */

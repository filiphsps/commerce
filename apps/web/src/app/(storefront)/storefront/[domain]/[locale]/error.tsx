'use client';

/* c8 ignore start */
import { Button } from '@/components/actionable/button';
import { Page } from '@/components/layout/page';
import PageContent from '@/components/page-content';
import { Content } from '@/components/typography/content';
import Heading from '@/components/typography/heading';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => console.error(error), [error]);
    return (
        <Page>
            <PageContent primary>
                <Heading title={error?.name} subtitle={<code>{error.message}</code>} />

                <Content>
                    <p>If this keeps happening please reach out to our support.</p>
                    <p>
                        <Button onClick={reset}>Try again</Button>
                    </p>
                </Content>
            </PageContent>
        </Page>
    );
}
/* c8 ignore stop */

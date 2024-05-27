'use client';

import { useEffect } from 'react';

import { Button } from '@/components/actionable/button';
import { Content } from '@/components/typography/content';
import Heading from '@/components/typography/heading';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => console.error(error), [error]);

    return (
        <>
            <Heading title={error.name} subtitle={<code>{error.message}</code>} />

            <Content>
                <p>If this keeps happening please reach out to our support.</p>
                <Button onClick={reset}>Try again</Button>
            </Content>
        </>
    );
}

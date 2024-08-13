'use client';

import styles from './error.module.scss';

import { useEffect } from 'react';

import { Button } from '@/components/actionable/button';
import PageContent from '@/components/page-content';
import { Content } from '@/components/typography/content';
import Heading from '@/components/typography/heading';
import { Label } from '@/components/typography/label';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => console.error(error), [error]);

    return (
        <>
            <PageContent className={styles.header}>
                <Heading
                    title={`Oh no! Something went wrong`}
                    subtitle={<Label>Internal server error</Label>}
                    reverse
                    bold
                />
            </PageContent>

            <div className={styles.content}>
                <Content>
                    <p>
                        Sorry, but an unexpected error occurred.
                        <br />
                        If this keeps happening please reach out to our support.
                    </p>

                    <p>In the meantime, here&apos;s a few things you can try:</p>
                    <ul>
                        <li>
                            <b>Refresh the page</b> (sometimes this helps).
                        </li>
                        <li>
                            <b>Try again</b> in 10 minutes.
                        </li>
                        <li>
                            <b>Contact support</b> and tell us what happened.
                        </li>
                    </ul>
                </Content>

                <Button onClick={reset}>Reload page</Button>
            </div>
        </>
    );
}

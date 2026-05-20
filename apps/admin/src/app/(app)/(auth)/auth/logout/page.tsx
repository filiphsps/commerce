import { Card, Heading } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LogoutAction } from './logout-action';

export const metadata: Metadata = {
    title: 'Logout',
};

export default async function IndexAdminPage({}: {}) {
    return (
        <>
            <Card.Header>
                <Heading level="h1">Logging out...</Heading>
            </Card.Header>

            <article>
                <Suspense>
                    <LogoutAction />
                </Suspense>
            </article>
        </>
    );
}

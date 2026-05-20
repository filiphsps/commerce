import { Accented, Card, Heading, Label } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { auth } from '@/auth';
import LoginButton from '@/components/login-button';

export type IndexAdminPageParams = {};

export const metadata: Metadata = {
    title: 'Login',
};

export async function IndexAdminPageContent() {
    const session = await auth();
    if (session?.user) {
        redirect('/');
    }

    return (
        <article>
            <LoginButton provider="github" />
        </article>
    );
}

export default async function IndexAdminPage({}: { params: IndexAdminPageParams }) {
    return (
        <>
            <Card.Header>
                <Label as="div">
                    Welcome <Accented>back</Accented>!
                </Label>
                <Heading level="h1">Login</Heading>
            </Card.Header>
            <Card.Divider />

            <Suspense>
                <IndexAdminPageContent />
            </Suspense>
        </>
    );
}

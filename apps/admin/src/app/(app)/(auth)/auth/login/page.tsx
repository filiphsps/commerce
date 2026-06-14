import { User } from '@nordcom/commerce-db';
import { Error as CommerceError } from '@nordcom/commerce-errors';
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

/**
 * Login entry. Redirects to the shop picker only when the session resolves to a real platform `users`
 * document. A JWT can outlive its users record (e.g. the backend was reseeded), and the rest of the app
 * bounces such a session to `/auth/login/` — which previously redirected straight back to `/`, trapping
 * the operator at an empty picker with no way to recover. Falling through to the sign-in button instead
 * lets the auth adapter re-provision the account on the next OAuth round-trip.
 *
 * @returns The sign-in button, unless an authenticated and provisioned operator is present (redirects).
 */
export async function IndexAdminPageContent() {
    const session = await auth();
    if (session?.user?.email) {
        let provisioned = false;
        try {
            await User.find({ filter: { email: session.user.email }, count: 1 });
            provisioned = true;
        } catch (error: unknown) {
            if (!CommerceError.isNotFound(error)) {
                throw error;
            }
        }
        if (provisioned) {
            redirect('/');
        }
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

import { User } from '@nordcom/commerce-db';
import { Error as CommerceError } from '@nordcom/commerce-errors';
import { Accented } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { auth } from '@/auth';
import { AuthShell } from '@/components/auth-shell';
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
        <div className="flex flex-col gap-3">
            <LoginButton provider="github" className="h-12 w-full" />
            <p className="text-balance text-center text-muted-foreground text-xs">
                Sign in with GitHub to manage your shops. We only read your public profile.
            </p>
        </div>
    );
}

/**
 * Skeleton placeholder shown while the session check in {@link IndexAdminPageContent} resolves, sized to
 * the sign-in button so the card height does not jump when the real control streams in.
 *
 * @returns A pulsing button-shaped placeholder.
 */
function LoginButtonFallback() {
    return (
        <div className="flex flex-col gap-3">
            <div className="h-12 w-full animate-pulse rounded-lg border-3 border-border border-solid bg-card/40" />
            <div className="mx-auto h-3 w-3/4 animate-pulse rounded bg-card/40" />
        </div>
    );
}

/**
 * The login screen: brand-consistent {@link AuthShell} hosting the provider sign-in control.
 *
 * @returns The login screen.
 */
export default async function IndexAdminPage({}: { params: IndexAdminPageParams }) {
    return (
        <AuthShell
            eyebrow={
                <>
                    Welcome <Accented>back</Accented>
                </>
            }
            title="Sign in"
        >
            <Suspense fallback={<LoginButtonFallback />}>
                <IndexAdminPageContent />
            </Suspense>
        </AuthShell>
    );
}

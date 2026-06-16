import { SignIn } from '@clerk/nextjs';
import { Accented } from '@nordcom/nordstar';
import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth-shell';
import { clerkAppearance } from '@/lib/clerk-appearance';

export const metadata: Metadata = {
    title: 'Sign in',
};

/**
 * The sign-in screen: Clerk's prebuilt `<SignIn/>` themed to the admin identity and nested inside the
 * brand-consistent {@link AuthShell} (logo, pink halo, "Welcome back" eyebrow). The catch-all
 * `[[...sign-in]]` segment lets Clerk own its multi-step verification sub-routes under `/auth/sign-in`.
 *
 * Routing is fixed to the admin's own surfaces — sign-in at `/auth/sign-in`, sign-up at
 * `/auth/sign-up`, and a successful sign-in lands on the app root `/` (onboarding routing is a later
 * task) — rather than Clerk's hosted Account Portal.
 *
 * @returns The themed sign-in screen.
 */
export default function SignInPage() {
    return (
        <AuthShell
            eyebrow={
                <>
                    Welcome <Accented>back</Accented>
                </>
            }
            title="Sign in"
        >
            <SignIn appearance={clerkAppearance} signUpUrl="/auth/sign-up" forceRedirectUrl="/" />
        </AuthShell>
    );
}

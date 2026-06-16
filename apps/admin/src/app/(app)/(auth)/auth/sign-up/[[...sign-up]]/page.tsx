import { SignUp } from '@clerk/nextjs';
import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth-shell';
import { clerkAppearance } from '@/lib/clerk-appearance';

export const metadata: Metadata = {
    title: 'Create your account',
};

/**
 * The sign-up screen: Clerk's prebuilt `<SignUp/>` themed to the admin identity and nested inside the
 * brand-consistent {@link AuthShell} (logo, pink halo, "Create your account" eyebrow). The catch-all
 * `[[...sign-up]]` segment lets Clerk own its multi-step verification sub-routes under `/auth/sign-up`.
 *
 * Routing is fixed to the admin's own surfaces — sign-up at `/auth/sign-up`, sign-in at
 * `/auth/sign-in`, and a completed sign-up lands on the app root `/` (self-serve onboarding routing
 * is a later task) — rather than Clerk's hosted Account Portal.
 *
 * @returns The themed sign-up screen.
 */
export default function SignUpPage() {
    return (
        <AuthShell eyebrow="Get started" title="Create your account">
            <SignUp appearance={clerkAppearance} signInUrl="/auth/sign-in" forceRedirectUrl="/" />
        </AuthShell>
    );
}

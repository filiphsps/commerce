import 'server-only';

import { CreateOrganization } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';

import { AuthShell } from '@/components/auth-shell';
import { clerkAppearance } from '@/lib/clerk-appearance';

export const metadata: Metadata = {
    title: 'Create your organization',
};

/**
 * The create-organization onboarding step: Clerk's prebuilt `<CreateOrganization/>` themed to the
 * admin identity and nested inside the brand-consistent {@link AuthShell} (logo, pink halo). New
 * operators (and the chooser's "Create organization" CTA) land here; an org is the tenant team that
 * owns storefronts, so it is created before the first storefront. On creation, Clerk sets the new org
 * active and routes to `/new` (the storefront wizard), which then stamps the shop with the active org.
 *
 * Gates on an authenticated Clerk session, redirecting to sign-in otherwise.
 *
 * @returns The themed create-organization screen.
 */
export default async function OnboardingPage() {
    const { userId } = await auth();
    if (!userId) {
        redirect('/auth/sign-in/' as Route);
    }

    return (
        <AuthShell eyebrow="Get started" title="Create your organization">
            <CreateOrganization appearance={clerkAppearance} afterCreateOrganizationUrl="/new/" skipInvitationScreen />
        </AuthShell>
    );
}

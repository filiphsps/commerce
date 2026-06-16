import 'server-only';

import { auth } from '@clerk/nextjs/server';
import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';

import { NewShopWizard } from './wizard';

export const metadata: Metadata = {
    title: 'Connect a new Shop',
};

/**
 * The setup entrypoint for connecting a new shop. Gates on an authenticated session (redirecting to
 * login otherwise) and renders the client wizard that collects the shop, its commerce-provider
 * connection, and optional branding before creating it. Reads the server-only `SERVICE_DOMAIN` and
 * passes it down — the wizard is a Client Component and cannot read the unprefixed env var itself.
 *
 * @returns The new-shop wizard for an authenticated operator.
 */
export default async function SetupNewPage(): Promise<React.JSX.Element> {
    const { userId } = await auth();
    if (!userId) {
        redirect('/auth/sign-in/' as Route);
    }

    return <NewShopWizard serviceDomain={process.env.SERVICE_DOMAIN} />;
}

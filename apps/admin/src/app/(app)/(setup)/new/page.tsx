import 'server-only';

import type { Metadata, Route } from 'next';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
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
    const session = await auth();
    if (!session?.user) {
        redirect('/auth/login/' as Route);
    }

    return <NewShopWizard serviceDomain={process.env.SERVICE_DOMAIN} />;
}

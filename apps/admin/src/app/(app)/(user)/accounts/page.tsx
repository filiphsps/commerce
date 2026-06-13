import 'server-only';

import { Heading } from '@nordcom/nordstar';

import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Account',
};

/**
 * Operator account page. The account-management surface is not built yet, so this renders an honest
 * placeholder instead of the bare "TODO" heading that was shipping to operators.
 *
 * @returns The account placeholder view.
 */
export default async function AccountPage() {
    return (
        <>
            <Heading level="h1">Account</Heading>
            <p className="text-muted-foreground">Operator account settings aren&rsquo;t available yet.</p>
        </>
    );
}

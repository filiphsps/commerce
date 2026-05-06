import { Heading } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import { LogoutAction } from './logout-action';

export const metadata: Metadata = {
    title: 'Logout',
};

export default async function IndexAdminPage({}: {}) {
    return (
        <section>
            <Heading level="h1">Logging out...</Heading>

            <LogoutAction />
        </section>
    );
}

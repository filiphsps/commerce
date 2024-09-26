import { Heading } from '@nordcom/nordstar';

import { LogoutAction } from './logout-action';

import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Logout'
};

export default async function IndexAdminPage({}: {}) {
    return (
        <section className="">
            <Heading level="h1">Logging out...</Heading>

            <LogoutAction />
        </section>
    );
}

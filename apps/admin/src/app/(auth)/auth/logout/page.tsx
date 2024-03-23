import styles from './page.module.scss';

import { Heading } from '@nordcom/nordstar';

import { LogoutAction } from './logout-action';

import type { Metadata } from 'next';

export type IndexAdminPageParams = {};

export const metadata: Metadata = {
    title: 'Logout'
};

export default async function IndexAdminPage({}: { params: IndexAdminPageParams }) {
    return (
        <section className={`${styles.container}`}>
            <Heading level="h1">Logging out...</Heading>

            <LogoutAction />
        </section>
    );
}

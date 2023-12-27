import type { Metadata } from 'next';
import { getSession } from 'next-auth/react';
import type { ReactNode } from 'react';
import DashboardProviders from './dashboard-providers';
import styles from './layout.module.scss';

export const metadata: Metadata = {
    title: {
        default: 'Account',
        template: `%s · Nordcom Commerce Admin`
    }
};

export default async function ShopLayout({ children }: { children: ReactNode }) {
    const session = await getSession();

    return (
        <DashboardProviders session={session}>
            <main className={`${styles.content}`}>{children}</main>
        </DashboardProviders>
    );
}

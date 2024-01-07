import LoginButton from '#/components/login-button';
import { getSession } from '#/utils/auth';
import { Card, Heading, Label } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import styles from './page.module.scss';

export type IndexAdminPageParams = {};

export const metadata: Metadata = {
    title: 'Login'
};

export default async function IndexAdminPage({}: { params: IndexAdminPageParams }) {
    const session = await getSession();
    if (session) {
        redirect('/admin/shop/');
    }

    return (
        <section className={`${styles.container}`}>
            <Card className={styles['login-card']}>
                <div className={styles['card-header']}>
                    <Label as="h1">Login</Label>
                    <Heading level="h3" as="h2">
                        Welcome back
                    </Heading>
                </div>

                <div className={styles.actions}>
                    <Suspense>
                        <LoginButton provider="github" className={styles.button} />
                    </Suspense>
                </div>
            </Card>
        </section>
    );
}

import LoginButton from '#/components/login-button';
import { Card, Heading } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import styles from './page.module.scss';

export type IndexAdminPageParams = {};

export const metadata: Metadata = {
    title: 'Login'
};

export default async function IndexAdminPage({}: { params: IndexAdminPageParams }) {
    return (
        <section className={`${styles.container}`}>
            <Heading level="h1">Login</Heading>

            <Card className={styles.providers}>
                <Suspense fallback={<>Loading...</>}>
                    <LoginButton provider="github" />
                </Suspense>
                <Suspense fallback={<>Loading...</>}>
                    <LoginButton provider="google" />
                </Suspense>
            </Card>
        </section>
    );
}

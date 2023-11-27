import Container from '#/components/container';
import LoginButton from '#/components/login-button';
import { Heading } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import styles from './page.module.scss';
import { Suspense } from 'react';

export type IndexAdminPageParams = {};

export const metadata: Metadata = {
    title: 'Login'
};

export default async function IndexAdminPage({}: { params: IndexAdminPageParams }) {
    return (
        <Container className={`${styles.container}`}>
            <Heading level="h1">Login</Heading>

            <Suspense fallback={<>Loading...</>}>
                <LoginButton provider="github" />
            </Suspense>
        </Container>
    );
}

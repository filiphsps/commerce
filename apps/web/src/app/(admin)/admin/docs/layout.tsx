import Container from '#/components/container';
import Header from '#/components/header';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import styles from './layout.module.scss';

export const metadata: Metadata = {
    metadataBase: new URL(`https://shops.nordcom.io/docs/`),
    title: {
        default: 'Overview',
        template: `%s - Docs · Nordcom Commerce`
    }
};

export default async function DocsLayout({ children }: { children: ReactNode }) {
    return (
        <Container className={`${styles.container}`}>
            <Header />

            <main className={`${styles.content}`}>{children}</main>
        </Container>
    );
}

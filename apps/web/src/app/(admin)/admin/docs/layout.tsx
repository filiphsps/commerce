import Container from '#/components/container';
import Header from '#/components/header';
import type { ReactNode } from 'react';
import styles from './page.module.scss';

export default async function DocsLayout({ children }: { children: ReactNode }) {
    return (
        <Container className={`${styles.container}`}>
            <Header />

            <div className={`${styles.content}`}>{children}</div>
        </Container>
    );
}

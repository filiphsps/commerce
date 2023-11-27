import Container from '#/components/container';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import styles from './layout.module.scss';

export const metadata: Metadata = {
    metadataBase: new URL(`https://shops.nordcom.io/news/`),
    title: {
        default: 'Overview',
        template: `%s · News · Nordcom Commerce`
    }
};

export default async function NewsLayout({ children }: { children: ReactNode }) {
    return (
        <Container className={`${styles.container}`}>
            <main className={`${styles.content}`}>{children}</main>
        </Container>
    );
}

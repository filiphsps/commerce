import Container from '#/components/container';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import styles from './layout.module.scss';

export const metadata: Metadata = {
    title: {
        default: 'Account',
        template: `%s · Admin · Nordcom Commerce`
    }
};

export default async function ShopLayout({ children }: { children: ReactNode }) {
    return (
        <Container className={`${styles.container}`}>
            <main className={`${styles.content}`}>{children}</main>
        </Container>
    );
}

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
    return <div className={styles.content}>{children}</div>;
}

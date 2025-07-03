import styles from './layout.module.scss';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    metadataBase: new URL(`https://${(process.env.LANDING_DOMAIN as string) || 'shops.nordcom.io'}/news/`),
    title: {
        default: 'Overview',
        template: `%s · News · Nordcom Commerce`
    }
};

export default async function NewsLayout({ children }: { children: ReactNode }) {
    return <div className={styles.content}>{children as any}</div>;
}

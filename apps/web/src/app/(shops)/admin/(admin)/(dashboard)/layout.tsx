import { View } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import styles from './layout.module.scss';

export const metadata: Metadata = {
    title: {
        default: 'Account',
        template: `%s · Nordcom Commerce Admin`
    }
};

export default async function ShopLayout({ children }: { children: ReactNode }) {
    return (
        <View className={`${styles.container}`}>
            <main className={`${styles.content}`}>{children}</main>
        </View>
    );
}

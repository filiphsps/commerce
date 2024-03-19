import { View } from '@nordcom/nordstar';
import styles from './layout.module.scss';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: {
        default: 'Account',
        template: `%s · Nordcom Commerce`
    }
};

export default async function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <div className={styles.container}>
            <View className={styles.content}>{children}</View>
        </div>
    );
}

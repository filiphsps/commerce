'use client';

import type { Shop } from '@/api/shop';
import type { Locale } from '@/utils/locale';
import { signIn } from 'next-auth/react';
import { useEffect } from 'react';
import styles from './login-content.module.scss';

export type LoginContentProps = {
    shop: Shop;
    locale: Locale;
};
export default function LoginContent({ locale }: LoginContentProps) {
    useEffect(() => {
        signIn('shopify', { callbackUrl: `/${locale.code}/account/` });
    }, []);

    return <div className={styles.container}></div>;
}

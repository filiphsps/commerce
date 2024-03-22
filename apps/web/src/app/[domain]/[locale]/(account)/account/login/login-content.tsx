'use client';

import styles from './login-content.module.scss';

import { useEffect } from 'react';
import { signIn } from 'next-auth/react';

import type { Shop } from '@nordcom/commerce-database';

import type { Locale } from '@/utils/locale';

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

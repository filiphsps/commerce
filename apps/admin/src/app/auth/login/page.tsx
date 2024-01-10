import LoginButton from '@/components/login-button';
import logo from '@/static/logo.svg';
import { getSession } from '@/utils/auth';
import { Card, Heading, Label } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import styles from './page.module.scss';

export type IndexAdminPageParams = {};

export const metadata: Metadata = {
    title: 'Login'
};

export default async function IndexAdminPage({}: { params: IndexAdminPageParams }) {
    const session = await getSession();
    if (session) {
        redirect('/');
    }

    return (
        <section className={`${styles.container}`}>
            <Card className={styles['login-card']}>
                <div className={styles['card-header']}>
                    <Link href="https://shops.nordcom.io/" title="Nordcom Commerce" className={styles.logo}>
                        <Image
                            className={styles.image}
                            src={logo}
                            alt="Nordcom Group Inc.'s Logo"
                            height={75}
                            width={150}
                            draggable={false}
                            decoding="async"
                            priority={true}
                        />
                    </Link>

                    <hr />

                    <Label as="h1">Login</Label>
                    <Heading level="h1" as="h2">
                        Welcome Back
                    </Heading>

                    <hr />
                </div>

                <div className={styles.actions}>
                    <Suspense>
                        <LoginButton provider="github" className={styles.button} />
                    </Suspense>
                </div>
            </Card>
        </section>
    );
}

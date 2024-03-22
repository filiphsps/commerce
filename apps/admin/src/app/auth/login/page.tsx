import styles from './page.module.scss';

import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Heading, Label } from '@nordcom/nordstar';

import { auth } from '@/utils/auth';

import ActionableCard from '@/components/actionable-card';
import LoginButton from '@/components/login-button';

import type { Metadata } from 'next';

export type IndexAdminPageParams = {};

export const metadata: Metadata = {
    title: 'Login'
};

export default async function IndexAdminPage({}: { params: IndexAdminPageParams }) {
    const session = await auth();
    if (!!session?.user?.id) {
        redirect('/');
    }

    return (
        <ActionableCard
            header={
                <>
                    <Link href="/" title="Nordcom Commerce">
                        <Image
                            src="https://shops.nordcom.io/logo.svg"
                            alt="Nordcom Group Inc.'s Logo"
                            height={75}
                            width={150}
                            draggable={false}
                            decoding="async"
                            priority={true}
                            loader={undefined}
                        />
                    </Link>

                    <hr />

                    <section>
                        <Label as="div">Welcome Back</Label>

                        <Heading level="h1">Login</Heading>
                    </section>
                </>
            }
            footer={
                <>
                    <Label>Nordcom Commerce is currently invite only</Label>
                </>
            }
        >
            <Suspense>
                <LoginButton provider="github" className={styles.button} />
            </Suspense>
        </ActionableCard>
    );
}

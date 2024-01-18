import ActionableCard from '@/components/actionable-card';
import { SignIn } from '@clerk/nextjs';
import { Heading, Label } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import styles from './page.module.scss';

export type IndexAdminPageParams = {};

export const metadata: Metadata = {
    title: 'Login'
};

export default async function IndexAdminPage({}: { params: IndexAdminPageParams }) {
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

                    <div>
                        <Label as="div">Welcome Back</Label>

                        <Heading level="h1">Login</Heading>
                    </div>
                </>
            }
            footer={
                <>
                    <Label className={styles.disclaimer}>Nordcom Commerce is currently invite only</Label>
                </>
            }
        >
            <Suspense>
                <SignIn path="/admin/auth/login" />
            </Suspense>
        </ActionableCard>
    );
}

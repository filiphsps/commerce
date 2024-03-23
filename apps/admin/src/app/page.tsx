import styles from './page.module.scss';

import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Accented, Button, Heading, Label, View } from '@nordcom/nordstar';

import { auth, signOut } from '@/utils/auth';
import { getShopsForUser } from '@/utils/fetchers';

import ActionableCard from '@/components/actionable-card';

import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Your Shops'
};

export default async function Overview() {
    const session = await auth();
    if (!session?.user?.id) {
        redirect('/auth/login/');
    }

    const { user } = session;
    const shops = await getShopsForUser(user.id!);

    const firstName = user.name?.split(' ').at(0) || null;
    const lastName = user.name?.split(' ').slice(1).join(' ') || null;

    const shopsActions = shops.map((shop) => (
        <Button key={shop.id} variant="solid" as={Link} href={`/${shop.id}/`}>
            {shop.name}
        </Button>
    ));

    return (
        <div className={styles.container}>
            <View className={styles.content}>
                <ActionableCard
                    header={
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
                    }
                    headerAction={
                        <Button
                            variant="outline"
                            onClick={async () => {
                                'use server';

                                signOut({ redirectTo: '/' });
                            }}
                        >
                            Logout
                        </Button>
                    }
                    actions={shopsActions.length > 1 ? shopsActions : null}
                    footer={
                        <>
                            <Button variant="solid" color="primary" disabled>
                                Connect a new Shop
                            </Button>
                        </>
                    }
                >
                    <>
                        <Label as="div">
                            Hi <Accented>{firstName || 'there'}</Accented> {lastName || ''}
                        </Label>

                        <Heading level="h1">Choose a Shop</Heading>
                    </>
                </ActionableCard>
            </View>
        </div>
    );
}

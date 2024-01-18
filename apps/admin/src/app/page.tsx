import ActionableCard from '@/components/actionable-card';
import { getShopsForUser } from '@/utils/fetchers';
import { UserButton, currentUser } from '@clerk/nextjs';
import { Accented, Button, Heading, Label, View } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import styles from './page.module.scss';

export const metadata: Metadata = {
    title: 'Your Shops'
};

export default async function Overview() {
    const user = await currentUser();
    if (!user) {
        return redirect('/auth/login/');
    }

    const shops = await getShopsForUser(user.id);

    const { firstName, lastName } = user;

    return (
        <div className={styles.container}>
            <View className={styles.content}>
                <ActionableCard
                    header={
                        <>
                            <div className={styles.header}>
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

                                <UserButton afterSignOutUrl="/admin/" />
                            </div>

                            <hr />

                            <div>
                                <Label as="div">
                                    Hi <Accented>{firstName || 'there'}</Accented> {lastName || ''}
                                </Label>

                                <Heading level="h1">Choose a Shop</Heading>
                            </div>
                        </>
                    }
                    footer={
                        <>
                            <Button variant="solid" color="primary">
                                Connect a new Shop
                            </Button>
                        </>
                    }
                >
                    {shops.length > 0 ? (
                        <>
                            {shops.map(({ id, name }) => (
                                <Button key={id} variant="outline" as={Link} href={`/${id}/`}>
                                    {name}
                                </Button>
                            ))}
                        </>
                    ) : null}
                </ActionableCard>
            </View>
        </div>
    );
}

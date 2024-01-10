import logo from '@/static/logo.svg';
import { getSession } from '@/utils/auth';
import { getShopsForUser } from '@/utils/fetchers';
import { Accented, Button, Card, Heading, Label, View } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import styles from './page.module.scss';

export const metadata: Metadata = {
    title: 'Your Shops'
};

export default async function Overview() {
    const session = await getSession();
    if (!session) {
        return redirect('/auth/login/');
    }

    const { user } = session;

    const shops = await getShopsForUser(user.id);

    const firstName = user.name.split(' ').at(0) || null;
    const lastName = user.name.split(' ').slice(1).join(' ') || null;

    return (
        <div className={styles.container}>
            <View className={styles.content}>
                <Card className={styles['shop-selector']}>
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

                        <Label as="div">
                            Hi <Accented>{firstName || 'there'}</Accented> {lastName || ''}
                        </Label>

                        <Heading level="h1">Choose a Shop</Heading>

                        <hr />
                    </div>

                    <div className={styles.actions}>
                        {shops.length > 0 ? (
                            <>
                                {shops.map(({ id, name }) => (
                                    <Button
                                        key={id}
                                        variant="outline"
                                        as={Link}
                                        href={`/${id}/`}
                                        className={styles.button}
                                    >
                                        {name}
                                    </Button>
                                ))}

                                <hr />
                            </>
                        ) : null}

                        <Button variant="solid" color="primary" className={styles.button}>
                            Connect a new Shop
                        </Button>
                    </div>
                </Card>
            </View>
        </div>
    );
}

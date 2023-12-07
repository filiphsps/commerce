import { getSession } from '#/utils/auth';
import { getShopsForUser } from '#/utils/fetchers';
import { Button, Card, Heading } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import styles from './page.module.scss';

export const metadata: Metadata = {
    title: 'Your Shops'
};

export default async function Overview() {
    const session = await getSession();
    if (!session) {
        redirect('/login/');
    }

    const { user } = session;

    const shops = await getShopsForUser(user.id);

    return (
        <section className={`${styles.container}`}>
            <Heading level="h1">Your Shops</Heading>
            <Heading level="h2">You currently manager {shops.length} shop(s)</Heading>

            <div className={styles.shops}>
                {shops.map(({ id, name }) => (
                    <Link key={id} href={`/shop/${id}/`}>
                        <Card>
                            <div>{name}</div>
                        </Card>
                    </Link>
                ))}
            </div>

            <div>
                <Button as={Link} href="/logout/">
                    Logout
                </Button>
            </div>
        </section>
    );
}

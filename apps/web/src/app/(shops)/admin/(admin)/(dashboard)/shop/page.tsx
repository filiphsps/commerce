import { getSession } from '#/utils/auth';
import { getShopsForUser } from '#/utils/fetchers';
import { Accented, Card, Heading } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import styles from './page.module.scss';

// Make sure this page is always dynamic.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Your Shops'
};

export default async function Overview() {
    const session = await getSession();
    if (!session) {
        return redirect('/login/');
    }

    const { user } = session;

    const shops = await getShopsForUser(user.id);

    if (shops.length <= 0) {
        return (
            <section className={`${styles.container}`}>
                <Heading level="h1">Hi {user.name.split(' ')[0]}</Heading>
                <Heading level="h2">
                    You are currently not assigned as a collaborator for any shop, if you believe this to be an error
                    please reach out to the Nordcom Commerce support team
                </Heading>
            </section>
        );
    }

    return (
        <section className={`${styles.container}`}>
            <Heading level="h1">
                Hi <Accented>{user.name.split(' ')[0]}</Accented> {user.name.split(' ').slice(1).join(' ')}
            </Heading>
            <Heading level="h2">
                You are currently assigned as a collaborator for <Accented>{shops.length}</Accented> shop(s), nicely
                done
            </Heading>

            <div className={styles.shops}>
                {shops.map(({ id, name }) => (
                    <Link key={id} href={`/shop/${id}/`}>
                        <Card className={styles.shop}>
                            <div>{name}</div>
                        </Card>
                    </Link>
                ))}
            </div>
        </section>
    );
}

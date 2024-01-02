import { SettingsBlock } from '#/components/settings-block';
import { getSession } from '#/utils/auth';
import { getShopsForUser } from '#/utils/fetchers';
import { Accented, Button, Card, Heading, Label } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import styles from './page.module.scss';

export const revalidate = 30;
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

    const firstName = user.name.split(' ').at(0) || null;
    const lastName = user.name.split(' ').slice(1).join(' ') || null;

    const headingSidebar = (
        <div className={styles.sidebar}>
            <SettingsBlock
                as="form"
                save={async () => {
                    'use server';

                    return redirect('/logout/');
                }}
                actionButtonLabel="Logout"
            />
        </div>
    );

    if (shops.length <= 0) {
        return (
            <section className={`${styles.container}`}>
                <div className={styles.heading}>
                    <div>
                        <Heading level="h1">Hi {firstName}..</Heading>
                        <Heading level="h2">
                            You are currently not assigned as a collaborator for any shop, if you believe this to be an
                            error please reach out to the Nordcom Commerce support team
                        </Heading>
                    </div>
                    {headingSidebar}
                </div>
            </section>
        );
    }

    return (
        <section className={styles.container}>
            <div className={styles.heading}>
                <Heading level="h1">
                    Hi <Accented>{firstName || 'there'}</Accented>
                    {lastName ? ` ${lastName}` : ''}
                </Heading>
                {headingSidebar}
            </div>

            <Card className={styles['shop-selector']}>
                <div className={styles['card-header']}>
                    <Label as="h1">Choose a Shop</Label>
                    <Heading level="h3" as="h2">
                        Your Shops
                    </Heading>
                </div>

                <div className={styles.actions}>
                    {shops.map(({ id, name }) => (
                        <Button
                            key={id}
                            variant="outline"
                            as={Link}
                            href={`/admin/shop/${id}/`}
                            className={styles.button}
                        >
                            {name}
                        </Button>
                    ))}
                    <hr />

                    <Button variant="outline" color="primary" className={styles.button}>
                        Connect a new Shop
                    </Button>
                </div>
            </Card>
        </section>
    );
}

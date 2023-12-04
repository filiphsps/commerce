import { getSession } from '#/utils/auth';
import { Button, Heading } from '@nordcom/nordstar';
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

    return (
        <section className={`${styles.container}`}>
            <Heading level="h1">Your Shops</Heading>
            <Heading level="h2">TODO: Show a list of user-accessible shops here.</Heading>

            <div>
                <Button as={Link} href="/logout/">
                    Logout
                </Button>
            </div>
        </section>
    );
}

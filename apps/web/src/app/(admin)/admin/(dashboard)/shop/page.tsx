import { getSession } from '#/utils/auth';
import { Heading } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import styles from './page.module.scss';
import { Button } from '#/components/button';
import Link from 'next/link';

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

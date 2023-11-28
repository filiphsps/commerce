import type { Metadata } from 'next';
import { getSession } from '#/utils/auth';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
    title: 'Your Shops'
};

export default async function Overview() {
    const session = await getSession();
    if (!session) {
        redirect('/login/');
    }

    return <section>TODO: Show a list of user-accessible shops here.</section>;
}

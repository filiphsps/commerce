import { auth } from '@/auth';
import { redirect } from 'next/navigation';

import LoginButton from '@/components/login-button';

import type { Metadata } from 'next';

export type IndexAdminPageParams = {};

export const metadata: Metadata = {
    title: 'Login'
};

export default async function IndexAdminPage({}: { params: any }) {
    const session = await auth();
    if (session?.user) {
        redirect('/');
    }

    return (
        <div>
            <LoginButton provider="github" className="" />
        </div>
    );
}

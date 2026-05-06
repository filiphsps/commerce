import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { auth } from '@/auth';
import LoginButton from '@/components/login-button';

export type IndexAdminPageParams = {};

export const metadata: Metadata = {
    title: 'Login',
};

export async function IndexAdminPageContent() {
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

export default async function IndexAdminPage({}: { params: IndexAdminPageParams }) {
    return (
        <Suspense>
            <IndexAdminPageContent />
        </Suspense>
    );
}

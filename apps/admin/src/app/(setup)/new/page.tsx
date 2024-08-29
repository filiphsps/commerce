import 'server-only';

import { Heading } from '@nordcom/nordstar';

import { auth } from '@/auth';
import { redirect } from 'next/navigation';

import type { Metadata } from 'next';

export type SetupNewPageProps = {};

export const metadata: Metadata = {
    title: 'New'
};

export default async function SetupNewPage({}: SetupNewPageProps) {
    const session = await auth();
    if (!session?.user) {
        redirect('/auth/login/');
    }

    return (
        <>
            <Heading level="h1">Connect a new Shop</Heading>
            <Heading level="h4" as="h2">
                Let&apos;s elevate your e-commerce store to the next level!
            </Heading>
        </>
    );
}

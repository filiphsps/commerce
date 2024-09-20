import 'server-only';

import { Heading } from '@nordcom/nordstar';

import type { Metadata } from 'next';

export type SetupNewPageProps = {};

export const metadata: Metadata = {
    title: 'Account'
};

export default async function AccountPage({}: SetupNewPageProps) {
    return (
        <>
            <Heading level="h1">TODO</Heading>
        </>
    );
}

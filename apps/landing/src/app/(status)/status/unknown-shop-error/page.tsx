import { Heading } from '@nordcom/nordstar';

import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Invalid or Unknown Shop'
};

export default async function StatusPage() {
    return (
        <>
            <Heading>Unknown Shop</Heading>
            <Heading level="h2">The requested shop or storefront you are trying to access does not exist</Heading>
        </>
    );
}

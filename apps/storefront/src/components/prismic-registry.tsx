'use client';

import type { Client } from '@prismicio/client';
import { PrismicProvider } from '@prismicio/react';
import type { ReactNode } from 'react';
import { linkResolver } from '@/utils/prismic';

export type PrismicRegistryProps = {
    client: Client;
    children: ReactNode;
};
export const PrismicRegistry = ({ client, children }: PrismicRegistryProps) => {
    // const repo = client.endpoint.split('//')[1].split('.')[0];

    return (
        <PrismicProvider client={client} linkResolver={linkResolver}>
            {children}
        </PrismicProvider>
    );
};

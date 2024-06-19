'use client';

import { linkResolver } from '@/utils/prismic';
import { PrismicPreview } from '@prismicio/next';
import { PrismicProvider } from '@prismicio/react';

import type { Client } from '@prismicio/client';
import type { ReactNode } from 'react';

export type PrismicRegistryProps = {
    client: Client;
    children: ReactNode;
};
export const PrismicRegistry = ({ client, children }: PrismicRegistryProps) => {
    const repo = client.endpoint.split('//')[1].split('.')[0];

    return (
        <PrismicProvider client={client} linkResolver={linkResolver}>
            {children}

            <PrismicPreview repositoryName={repo} />
        </PrismicProvider>
    );
};

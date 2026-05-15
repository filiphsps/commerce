import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getServiceUrl } from '@/utils/domains';

export const metadata: Metadata = {
    metadataBase: new URL(`${getServiceUrl()}/docs/`),
    title: {
        absolute: 'Documentation · Nordcom Commerce',
        template: `%s · Documentation · Nordcom Commerce`,
    },
};

export default async function DocsLayout({ children }: { children: ReactNode }) {
    return children;
}

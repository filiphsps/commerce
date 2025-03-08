import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    metadataBase: new URL(`https://${(process.env.LANDING_DOMAIN as string) || 'shops.nordcom.io'}/docs/`),
    title: {
        absolute: 'Documentation · Nordcom Commerce',
        template: `%s · Documentation · Nordcom Commerce`
    }
};

export default async function DocsLayout({ children }: { children: ReactNode }) {
    return children;
}

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getServiceUrl } from '@/utils/domains';

export const metadata: Metadata = {
    metadataBase: new URL(`${getServiceUrl()}/news/`),
    title: {
        default: 'Overview',
        template: `%s · News · Nordcom Commerce`,
    },
};

export default async function NewsLayout({ children }: { children: ReactNode }) {
    return <div className="flex w-full max-w-full flex-col gap-7 pt-7">{children}</div>;
}

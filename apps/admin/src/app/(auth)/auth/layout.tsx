import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: {
        default: 'Account',
        template: `%s · Nordcom Commerce`
    }
};

export default async function AuthLayout({ children }: { children: ReactNode }) {
    return <div className="flex h-full min-h-full w-full items-center justify-center">{children as any}</div>;
}

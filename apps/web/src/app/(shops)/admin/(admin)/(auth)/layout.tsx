import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
    title: {
        default: 'Account',
        template: `%s · Nordcom Commerce`
    }
};

export default async function AuthLayout({ children }: { children: ReactNode }) {
    return <>{children}</>;
}

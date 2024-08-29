import 'server-only';

import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';

import { auth } from '@/auth';
import { notFound, redirect } from 'next/navigation';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export type ShopLayoutProps = {
    children: ReactNode;
    params: {
        domain: string;
    };
};

export async function generateMetadata({ params: { domain } }: ShopLayoutProps): Promise<Metadata> {
    const session = await auth();
    if (!session?.user) {
        redirect('/auth/login/');
    }

    try {
        const shop = await Shop.findByDomain(domain, { convert: true });
        return {
            title: {
                default: 'Home',
                template: `${shop.name} · %s · Nordcom Commerce`
            },
            robots: {
                follow: true,
                index: false
            }
        };
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}

export default async function ShopLayout({ children, params: { domain } }: ShopLayoutProps) {
    const session = await auth();
    if (!session?.user) {
        redirect('/auth/login/');
    }

    return <main className="min-h-screen">{children}</main>;
}

import 'server-only';

import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';

import { auth } from '@/auth';
import { notFound, redirect } from 'next/navigation';

import { Header } from '@/components/header';

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

    return (
        <div className="flex min-h-screen w-full flex-col">
            <Header />

            <div className="flex h-full w-full grow flex-col-reverse items-stretch justify-stretch gap-2 md:flex-row">
                <aside className="block h-full w-full max-w-full p-4 md:w-64">
                    <nav>nav</nav>
                </aside>

                <main className="flex min-h-full w-full grow flex-col justify-stretch gap-4 border-0 border-b border-solid border-gray-300 p-4 md:h-screen md:max-h-[calc(100vh-4rem)] md:overflow-y-scroll md:overscroll-y-auto md:border-b-0 md:border-l">
                    {children}
                </main>
            </div>
        </div>
    );
}

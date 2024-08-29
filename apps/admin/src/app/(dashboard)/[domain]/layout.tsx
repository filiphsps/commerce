import 'server-only';

import { PiBinoculars, PiImages, PiTagLight } from 'react-icons/pi';

import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';

import { auth } from '@/auth';
import { cn } from '@/utils/tailwind';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/avatar';
import { Button } from '@/components/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/card';
import { Header } from '@/components/header';
import { ScrollArea } from '@/components/scroll-area';

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

const LINK_STYLES =
    'hover:bg-muted flex w-full items-center justify-start gap-2 rounded-md px-3 py-2 hover:text-primary *:stroke-2';

export default async function ShopLayout({ children, params: { domain } }: ShopLayoutProps) {
    const session = await auth();
    if (!session?.user) {
        redirect('/auth/login/');
    }

    const shop = await Shop.findByDomain(domain, { convert: true });
    const urlBase = `/${shop.domain}`;

    return (
        <div className="flex h-full w-full grow flex-col-reverse items-stretch justify-stretch md:flex-row">
            <Card className="border-border fixed -left-full top-0 z-50 flex h-screen w-80 max-w-full flex-col gap-2 rounded-none border-0 border-r border-solid transition-all group-data-[menu-open=true]/body:left-0 lg:sticky lg:left-0">
                <CardHeader>
                    <div className="flex justify-start gap-3">
                        <Avatar>
                            <AvatarImage src={shop.icons?.favicon?.src} />
                            <AvatarFallback>{shop.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>

                        <div className="space-y-0">
                            <h4 className="text-sm font-semibold">{shop.name}</h4>
                            <p className="text-xs">{shop.domain}</p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="h-full grow">
                    <ScrollArea className="h-full">
                        <nav className="text-muted-foreground flex w-full flex-col gap-2 text-sm font-medium">
                            <Link href={`${urlBase}/`} className={cn(LINK_STYLES, 'text-primary bg-muted')}>
                                <PiBinoculars className="text-lg" />
                                Home
                            </Link>
                            <Link href={`${urlBase}/products/`} className={LINK_STYLES}>
                                <PiTagLight className="text-lg" />
                                Products
                            </Link>
                            <Link href={`${urlBase}/content/`} className={LINK_STYLES}>
                                <PiImages className="text-lg" />
                                Content
                            </Link>
                        </nav>
                    </ScrollArea>
                </CardContent>

                <CardFooter>
                    <div className="flex w-full flex-col justify-start gap-3">
                        <Button className="w-full" asChild>
                            <Link href="/new/">Connect Shop</Link>
                        </Button>
                    </div>
                </CardFooter>
            </Card>

            <div className="flex h-full min-h-screen w-full grow flex-col">
                <Header />

                <main className="flex h-full min-h-[200vh] w-full flex-col justify-stretch gap-4 p-4">{children}</main>
            </div>
        </div>
    );
}

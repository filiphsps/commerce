import 'server-only';

import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';
import { Button } from '@nordcom/nordstar';

import { auth } from '@/auth';
import { Binoculars, Images, MessageCircleHeart, Settings, Tag } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/avatar';
import { Card } from '@/components/card';
import { Header } from '@/components/header';
import { MenuItem } from '@/components/menu-item';
import { ScrollArea } from '@/components/scroll-area';

import type { Metadata, Route } from 'next';
import type { ReactNode } from 'react';

export type ShopLayoutProps = {
    children: ReactNode;
    params: Promise<{
        domain: string;
    }>;
};

export async function generateMetadata({ params }: ShopLayoutProps): Promise<Metadata> {
    const session = await auth();
    if (!session?.user) {
        redirect('/auth/login/');
    }

    const { domain } = await params;

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

export default async function ShopLayout({ children, params }: ShopLayoutProps) {
    const session = await auth();
    if (!session?.user) {
        redirect('/auth/login/');
    }

    const { domain } = await params;

    let shop: Awaited<ReturnType<typeof Shop.findByDomain>>;
    try {
        shop = await Shop.findByDomain(domain, { convert: true });
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        console.error(error);
        throw error;
    }

    const urlBase = `/${shop.domain}`;

    return (
        <div className="flex h-full w-full grow flex-col-reverse items-stretch justify-stretch md:flex-row">
            <Card className="supports-[backdrop-filter]:bg-background/75 bg-background/95 fixed -left-full top-0 z-50 mt-[4.5rem] flex h-[calc(100vh-4.5rem)] w-80 max-w-full flex-col gap-2 rounded-none border-0 border-r-2 border-solid backdrop-blur transition-all group-data-[menu-open=true]/body:left-0 md:z-0 md:mt-0 md:h-full lg:sticky lg:left-0">
                <Card.header className="h-[4.5rem] max-h-[4.5rem] min-h-[4.5rem]">
                    <div className="flex items-center justify-start gap-3">
                        <Avatar>
                            <AvatarImage src={shop.icons?.favicon?.src} />
                            <AvatarFallback>{shop.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>

                        <div className="flex flex-col gap-1">
                            <h4 className="text-sm font-semibold leading-none">{shop.name}</h4>
                            <Link
                                href={`https://${shop.domain}/?utm_campaign=admin&utm_source=nordcom-commerce`}
                                target="_blank"
                                className="text-foreground/75 text-xs leading-none"
                            >
                                {shop.domain}
                            </Link>
                        </div>
                    </div>
                </Card.header>

                <Card.content className="h-full grow">
                    <ScrollArea className="h-full">
                        <nav className="text-muted-foreground flex w-full flex-col gap-2 text-sm font-medium">
                            <MenuItem href={`${urlBase}/` as Route}>
                                <Binoculars className="text-lg" />
                                Home
                            </MenuItem>
                            <MenuItem href={`${urlBase}/products` as Route}>
                                <Tag className="text-lg" />
                                Products
                            </MenuItem>
                            <MenuItem href={`${urlBase}/reviews` as Route}>
                                <MessageCircleHeart className="text-lg" />
                                Reviews
                            </MenuItem>
                            <MenuItem href={`${urlBase}/content` as Route}>
                                <Images className="text-lg" />
                                Content
                            </MenuItem>

                            <MenuItem href={`${urlBase}/settings` as Route}>
                                <Settings className="text-lg" />
                                Settings
                            </MenuItem>
                        </nav>
                    </ScrollArea>
                </Card.content>

                <Card.footer>
                    <div className="flex w-full flex-col justify-start gap-3">
                        <Button as={Link} href="/new" className="w-full" variant="outline" color="foreground">
                            Connect a new Shop
                        </Button>
                    </div>
                </Card.footer>
            </Card>

            <div className="flex h-full min-h-screen w-full grow flex-col">
                <Header className="h-[4.5rem] max-h-[4.5rem] min-h-[4.5rem]" />

                <main className="relative flex h-full min-h-[150vh] w-full flex-col justify-stretch gap-4 p-4">
                    {children}
                </main>
            </div>
        </div>
    );
}

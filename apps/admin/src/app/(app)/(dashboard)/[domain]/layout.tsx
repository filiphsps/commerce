import 'server-only';

import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';
import {
    Binoculars,
    Building2,
    ImageIcon,
    Images,
    MessageCircleHeart,
    Settings,
    Store,
    Tag,
    Users,
} from 'lucide-react';
import type { Metadata, Route } from 'next';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { auth } from '@/auth';
import type { CommandPaletteItem } from '@/components/shell/command-palette';
import type { IconRailItem } from '@/components/shell/icon-rail';
import { MobileNav } from '@/components/shell/mobile-nav';
import { ShellHeader } from '@/components/shell/shell-header';
import { ShellRoot } from '@/components/shell/shell-root';
import { getAuthedCmsCtx } from '@/lib/cms-ctx';
import { getShopsForUser } from '@/lib/shops-for-user';
import { gravatarUrl } from '@/utils/gravatar';

export type ShopLayoutProps = {
    children: ReactNode;
    subnav: ReactNode;
    inspector: ReactNode;
    params: Promise<{ domain: string }>;
};

export async function generateMetadata({ params }: ShopLayoutProps): Promise<Metadata> {
    const session = await auth();
    if (!session?.user) redirect('/auth/login/' as Route);
    const { domain } = await params;
    try {
        const shop = await Shop.findByDomain(domain, { convert: true });
        return {
            title: { default: 'Home', template: `${shop.name} · %s · Nordcom Commerce` },
            robots: { follow: true, index: false },
        };
    } catch (error: unknown) {
        if (Error.isNotFound(error)) notFound();
        throw error;
    }
}

export default async function ShopLayout({ children, subnav, inspector, params }: ShopLayoutProps) {
    const session = await auth();
    if (!session?.user) redirect('/auth/login/' as Route);
    const { domain } = await params;

    let shop: Awaited<ReturnType<typeof Shop.findByDomain>>;
    try {
        shop = await Shop.findByDomain(domain, { convert: true });
    } catch (error: unknown) {
        if (Error.isNotFound(error)) notFound();
        console.error(error);
        throw error;
    }

    const { user } = await getAuthedCmsCtx(domain);
    const isAdmin = user.role === 'admin';

    const urlBase = `/${shop.domain}`;
    const iconRailItems: IconRailItem[] = [
        { href: `${urlBase}/` as Route, label: 'Home', icon: <Binoculars className="h-5 w-5" /> },
        { href: `${urlBase}/products` as Route, label: 'Products', icon: <Tag className="h-5 w-5" /> },
        { href: `${urlBase}/reviews` as Route, label: 'Reviews', icon: <MessageCircleHeart className="h-5 w-5" /> },
        { href: `${urlBase}/content` as Route, label: 'Content', icon: <Images className="h-5 w-5" /> },
        { href: `${urlBase}/settings` as Route, label: 'Settings', icon: <Settings className="h-5 w-5" /> },
        ...(isAdmin
            ? [
                  {
                      href: `${urlBase}/settings/tenants/` as Route,
                      label: 'Tenants',
                      icon: <Building2 className="h-5 w-5" />,
                  },
                  {
                      href: `${urlBase}/settings/users/` as Route,
                      label: 'Users',
                      icon: <Users className="h-5 w-5" />,
                  },
                  {
                      href: `${urlBase}/settings/media/` as Route,
                      label: 'Media',
                      icon: <ImageIcon className="h-5 w-5" />,
                  },
                  {
                      href: `${urlBase}/settings/shop/` as Route,
                      label: 'Shop',
                      icon: <Store className="h-5 w-5" />,
                  },
              ]
            : []),
    ];

    const commandPaletteItems: CommandPaletteItem[] = iconRailItems.map((item) => ({
        id: item.label.toLowerCase(),
        label: item.label,
        href: item.href,
        group: 'Navigate',
        icon: item.icon,
    }));

    const shopsForSwitcher = await getShopsForUser(user.id);

    const mobileNavContent = <MobileNav items={iconRailItems} subnav={subnav} />;
    const header = (
        <ShellHeader
            shop={{ name: shop.name, domain: shop.domain }}
            user={{
                name: user.name,
                email: user.email ?? undefined,
                image: gravatarUrl(user.email),
                role: user.role,
            }}
            shopsForSwitcher={shopsForSwitcher}
            commandPaletteItems={commandPaletteItems}
            mobileNavContent={mobileNavContent}
        />
    );

    return (
        <ShellRoot header={header} subnav={subnav} inspector={inspector} iconRailItems={iconRailItems}>
            {children}
        </ShellRoot>
    );
}

import 'server-only';

import { auth } from '@clerk/nextjs/server';
import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';
import {
    Binoculars,
    Building2,
    ImageIcon,
    Images,
    MessageCircleHeart,
    Plus,
    Settings,
    Store,
    Tag,
    UserCog,
    Users,
} from 'lucide-react';
import type { Metadata, Route } from 'next';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { ActiveOrgSync } from '@/components/shell/active-org-sync';
import type { CommandPaletteItem } from '@/components/shell/command-palette';
import type { IconRailGroup, IconRailItem } from '@/components/shell/icon-rail';
import { MobileNav } from '@/components/shell/mobile-nav';
import { ShellHeader } from '@/components/shell/shell-header';
import { ShellRoot } from '@/components/shell/shell-root';
import { getAuthedCmsCtx } from '@/lib/cms-ctx';
import { getShopsForUser } from '@/lib/shops-for-user';

export type ShopLayoutProps = {
    children: ReactNode;
    subnav: ReactNode;
    inspector: ReactNode;
    params: Promise<{ domain: string }>;
};

export async function generateMetadata({ params }: ShopLayoutProps): Promise<Metadata> {
    const { userId } = await auth();
    if (!userId) redirect('/auth/sign-in/' as Route);
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
    const { userId } = await auth();
    if (!userId) redirect('/auth/sign-in/' as Route);
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
    const workspaceItems: IconRailItem[] = [
        { href: `${urlBase}/` as Route, label: 'Home', icon: <Binoculars className="h-5 w-5" /> },
        { href: `${urlBase}/products` as Route, label: 'Products', icon: <Tag className="h-5 w-5" /> },
        { href: `${urlBase}/reviews` as Route, label: 'Reviews', icon: <MessageCircleHeart className="h-5 w-5" /> },
        { href: `${urlBase}/content` as Route, label: 'Content', icon: <Images className="h-5 w-5" /> },
        { href: `${urlBase}/settings` as Route, label: 'Settings', icon: <Settings className="h-5 w-5" /> },
    ];
    const administrationItems: IconRailItem[] = isAdmin
        ? [
              {
                  href: `${urlBase}/settings/tenants/` as Route,
                  label: 'Tenants',
                  icon: <Building2 className="h-5 w-5" />,
              },
              { href: `${urlBase}/settings/users/` as Route, label: 'Users', icon: <Users className="h-5 w-5" /> },
              { href: `${urlBase}/settings/media/` as Route, label: 'Media', icon: <ImageIcon className="h-5 w-5" /> },
              { href: `${urlBase}/settings/shop/` as Route, label: 'Shop', icon: <Store className="h-5 w-5" /> },
          ]
        : [];

    const iconRailGroups: IconRailGroup[] = [
        { id: 'workspace', label: 'Workspace', items: workspaceItems },
        ...(administrationItems.length > 0
            ? [{ id: 'administration', label: 'Administration', items: administrationItems }]
            : []),
    ];

    const navItems = iconRailGroups.flatMap((group) => group.items);
    const shopsForSwitcher = await getShopsForUser(user.id);

    // Palette groups render in this insertion order (the palette prepends a client-side "Recent"
    // group and injects the theme toggle into Actions): Actions → Navigate → Shops.
    const actionCommands: CommandPaletteItem[] = [
        {
            id: 'action:account',
            label: 'Account settings',
            href: '/accounts' as Route,
            group: 'Actions',
            icon: <UserCog className="h-4 w-4" />,
            keywords: ['profile', 'preferences'],
        },
        {
            id: 'action:new-shop',
            label: 'Connect a new shop',
            href: '/new' as Route,
            group: 'Actions',
            icon: <Plus className="h-4 w-4" />,
            keywords: ['add', 'store', 'tenant'],
        },
    ];
    const navigateCommands: CommandPaletteItem[] = navItems.map((item) => ({
        id: `nav:${item.label.toLowerCase()}`,
        label: item.label,
        href: item.href,
        group: 'Navigate',
        icon: item.icon,
    }));
    const shopCommands: CommandPaletteItem[] =
        shopsForSwitcher.length > 1
            ? shopsForSwitcher.map((entry) => ({
                  id: `shop:${entry.domain}`,
                  label: entry.name,
                  href: `/${entry.domain}/` as Route,
                  group: 'Shops',
                  icon: <Store className="h-4 w-4" />,
                  keywords: [entry.domain],
              }))
            : [];
    const commandPaletteItems: CommandPaletteItem[] = [...actionCommands, ...navigateCommands, ...shopCommands];

    const mobileNavContent = <MobileNav groups={iconRailGroups} subnav={subnav} />;
    const header = (
        <ShellHeader
            shop={{ name: shop.name, domain: shop.domain }}
            shopsForSwitcher={shopsForSwitcher}
            commandPaletteItems={commandPaletteItems}
            navSections={navItems.map((item) => ({ label: item.label, href: item.href }))}
            mobileNavContent={mobileNavContent}
        />
    );

    return (
        <ShellRoot header={header} subnav={subnav} inspector={inspector} iconRailGroups={iconRailGroups}>
            <ActiveOrgSync clerkOrgId={shop.clerkOrgId ?? null} />
            {children}
        </ShellRoot>
    );
}

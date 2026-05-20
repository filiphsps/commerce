import 'server-only';

import type { Route } from 'next';

import { NavItem } from '@/components/ui/nav-item';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

type Props = { params: Promise<{ domain: string }> };

export default async function SettingsSubNav({ params }: Props) {
    const { domain } = await params;
    const { user } = await getAuthedPayloadCtx(domain);
    const isAdmin = user.role === 'admin';

    const base = `/${domain}/settings`;
    return (
        <div className="flex flex-col gap-1">
            <p className="px-3 pb-2 font-bold text-muted-foreground text-xs uppercase tracking-wider">Settings</p>
            <NavItem href={`${base}/` as Route}>Overview</NavItem>
            <NavItem href={`${base}/general/` as Route}>General</NavItem>
            {isAdmin ? (
                <>
                    <NavItem href={`${base}/tenants/` as Route}>Tenants</NavItem>
                    <NavItem href={`${base}/users/` as Route}>Users</NavItem>
                    <NavItem href={`${base}/media/` as Route}>Media</NavItem>
                    <NavItem href={`${base}/shop/` as Route}>Shop</NavItem>
                </>
            ) : null}
        </div>
    );
}

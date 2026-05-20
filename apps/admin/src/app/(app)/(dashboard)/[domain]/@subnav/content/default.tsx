import 'server-only';

import type { Route } from 'next';

import { NavItem } from '@/components/ui/nav-item';

type Props = { params: Promise<{ domain: string }> };

export default async function ContentSubNav({ params }: Props) {
    const { domain } = await params;
    const base = `/${domain}/content`;
    return (
        <div className="flex flex-col gap-1">
            <p className="px-3 pb-2 font-bold text-muted-foreground text-xs uppercase tracking-wider">Content</p>
            <NavItem href={`${base}/` as Route}>Overview</NavItem>
            <NavItem href={`${base}/business-data/` as Route}>Business data</NavItem>
            <NavItem href={`${base}/header/` as Route}>Header</NavItem>
            <NavItem href={`${base}/footer/` as Route}>Footer</NavItem>
            <NavItem href={`${base}/pages/` as Route}>Pages</NavItem>
            <NavItem href={`${base}/articles/` as Route}>Articles</NavItem>
            <NavItem href={`${base}/product-metadata/` as Route}>Product metadata</NavItem>
            <NavItem href={`${base}/collection-metadata/` as Route}>Collection metadata</NavItem>
        </div>
    );
}

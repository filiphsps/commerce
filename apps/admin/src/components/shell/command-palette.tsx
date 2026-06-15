'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { SunMoon } from 'lucide-react';
import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { useTheme } from '@/components/theme/theme-provider';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { resolveActiveHref } from '@/utils/active-nav';

export type CommandPaletteItem = {
    id: string;
    label: string;
    href: Route;
    group: string;
    icon?: ReactNode;
    keywords?: string[];
};

export type CommandPaletteProps = {
    items: CommandPaletteItem[];
};

/** How many recently-visited sections to surface, and how many to retain in storage. */
const RECENT_VISIBLE = 4;
const RECENT_RETAINED = 8;

/** Tenant-scoped localStorage key for the recent-section trail. */
function recentKey(domain: string): string {
    return `admin:recent-nav:${domain}`;
}

/** Reads the domain segment out of an admin pathname (`/acme.com/settings` → `acme.com`). */
function domainOf(pathname: string): string | undefined {
    return pathname.split('/')[1] || undefined;
}

/**
 * Radix Dialog-based command palette (⌘K / Ctrl+K). Beyond raw navigation it surfaces a recent-section
 * trail (tenant-scoped localStorage), an Actions group led by an in-place theme toggle, and any Shops
 * group the layout supplies. Recents are recorded on every route change while mounted and resolved back
 * to the Navigate items so labels/icons stay consistent.
 *
 * @param props.items - Grouped commands; the layout supplies Actions, Navigate, and Shops in that order.
 */
export function CommandPalette({ items }: CommandPaletteProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { preference, setPreference } = useTheme();
    const [open, setOpen] = useState(false);
    const [recentHrefs, setRecentHrefs] = useState<string[]>([]);

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                setOpen((o) => !o);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // Group the supplied items by their `group`, preserving the layout's insertion order. Actions is
    // pulled out so the in-place theme toggle can lead it; everything else renders in order after.
    const { actionItems, navigateItems, otherGroups } = useMemo(() => {
        const byGroup = new Map<string, CommandPaletteItem[]>();
        const order: string[] = [];
        for (const item of items) {
            if (!byGroup.has(item.group)) {
                byGroup.set(item.group, []);
                order.push(item.group);
            }
            byGroup.get(item.group)?.push(item);
        }
        return {
            actionItems: byGroup.get('Actions') ?? [],
            navigateItems: byGroup.get('Navigate') ?? [],
            // Actions and Navigate render in fixed slots; everything else (e.g. Shops) follows in order.
            otherGroups: order
                .filter((group) => group !== 'Actions' && group !== 'Navigate')
                .map((group) => [group, byGroup.get(group) ?? []] as const),
        };
    }, [items]);

    const activeNavHref = useMemo(
        () =>
            resolveActiveHref(
                pathname,
                navigateItems.map((item) => item.href.toString()),
            ),
        [pathname, navigateItems],
    );

    // Record the current section into the recent trail on every navigation.
    useEffect(() => {
        const domain = domainOf(pathname);
        if (!domain || !activeNavHref) return;
        try {
            const prev = JSON.parse(localStorage.getItem(recentKey(domain)) ?? '[]') as string[];
            const next = [activeNavHref, ...prev.filter((href) => href !== activeNavHref)].slice(0, RECENT_RETAINED);
            localStorage.setItem(recentKey(domain), JSON.stringify(next));
        } catch {
            // Ignore storage failures (private mode, quota) — recents are a convenience, not state.
        }
    }, [pathname, activeNavHref]);

    // Load the trail when the palette opens so it reflects the latest navigation.
    useEffect(() => {
        if (!open) return;
        const domain = domainOf(pathname);
        if (!domain) return;
        try {
            setRecentHrefs(JSON.parse(localStorage.getItem(recentKey(domain)) ?? '[]') as string[]);
        } catch {
            setRecentHrefs([]);
        }
    }, [open, pathname]);

    const recentItems = useMemo(() => {
        return recentHrefs
            .filter((href) => href !== activeNavHref)
            .map((href) => navigateItems.find((item) => item.href.toString() === href))
            .filter((item): item is CommandPaletteItem => Boolean(item))
            .slice(0, RECENT_VISIBLE);
    }, [recentHrefs, activeNavHref, navigateItems]);

    const go = (href: Route) => {
        setOpen(false);
        router.push(href);
    };

    const nextPreference = preference === 'dark' ? 'system' : 'dark';
    const themeLabel = nextPreference === 'dark' ? 'Switch to dark theme' : 'Switch to system theme';

    const renderItem = (item: CommandPaletteItem, valueSuffix = '') => (
        <CommandItem
            key={`${item.id}${valueSuffix}`}
            value={`${item.label} ${(item.keywords ?? []).join(' ')}${valueSuffix}`}
            onSelect={() => go(item.href)}
        >
            {item.icon}
            {item.label}
        </CommandItem>
    );

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Portal>
                <Dialog.Overlay className="data-[state=open]:fade-in fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in" />
                <Dialog.Content className="data-[state=open]:fade-in data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-2 fixed top-[18%] left-1/2 z-50 w-160 max-w-[90vw] -translate-x-1/2 overflow-hidden rounded-lg border-2 border-border bg-popover shadow-2xl data-[state=open]:animate-in">
                    <Dialog.Title className="sr-only">Command Palette</Dialog.Title>
                    <Command label="Command Menu">
                        <CommandInput placeholder="Type a command or search…" />
                        <CommandList>
                            <CommandEmpty>No results.</CommandEmpty>

                            {recentItems.length > 0 ? (
                                <CommandGroup heading="Recent">
                                    {recentItems.map((item) => renderItem(item, ' recent'))}
                                </CommandGroup>
                            ) : null}

                            <CommandGroup heading="Actions">
                                <CommandItem
                                    value={`theme appearance dark system ${themeLabel}`}
                                    onSelect={() => {
                                        setOpen(false);
                                        // setPreference applies the theme and mirrors it to the admin-theme cookie;
                                        // the account page owns durable cross-device persistence.
                                        setPreference(nextPreference);
                                    }}
                                >
                                    <SunMoon className="h-4 w-4" />
                                    {themeLabel}
                                </CommandItem>
                                {actionItems.map((item) => renderItem(item))}
                            </CommandGroup>

                            {navigateItems.length > 0 ? (
                                <CommandGroup heading="Navigate">
                                    {navigateItems.map((item) => renderItem(item))}
                                </CommandGroup>
                            ) : null}

                            {otherGroups.map(([group, list]) => (
                                <CommandGroup key={group} heading={group}>
                                    {list.map((item) => renderItem(item))}
                                </CommandGroup>
                            ))}
                        </CommandList>
                    </Command>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

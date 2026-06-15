'use client';

import { DropdownMenu } from '@nordcom/nordstar';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';

import { cn } from '@/utils/tailwind';

export type ShopSwitcherShop = { name: string; domain: string };

export type ShopSwitcherProps = {
    current: ShopSwitcherShop;
    shops: ShopSwitcherShop[];
};

/**
 * Dropdown that lets operators switch between their accessible shops, navigating to the shop's root route on select.
 *
 * @param props.current - The currently active shop.
 * @param props.shops - All shops available in the switcher.
 */
export function ShopSwitcher({ current, shops }: ShopSwitcherProps) {
    return (
        <DropdownMenu modal={false}>
            <DropdownMenu.Trigger
                className={cn(
                    'flex h-9 items-center gap-2 rounded-md border-2 border-border bg-background px-3 font-bold text-sm uppercase tracking-wide transition-colors hover:bg-muted',
                )}
            >
                <span className="truncate">{current.name}</span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="start" className="min-w-56">
                <DropdownMenu.Label>Switch shop</DropdownMenu.Label>
                {shops.map((shop) => {
                    const active = shop.domain === current.domain;
                    return (
                        <DropdownMenu.Item key={shop.domain} asChild>
                            <Link
                                href={`/${shop.domain}/` as Route}
                                className="flex w-full items-center justify-between gap-2"
                            >
                                <span>{shop.name}</span>
                                {active ? <Check className="h-4 w-4" /> : null}
                            </Link>
                        </DropdownMenu.Item>
                    );
                })}
                <DropdownMenu.Separator />
                <DropdownMenu.Item asChild>
                    <Link href={'/new' as Route} className="flex w-full items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Connect a new Shop
                    </Link>
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu>
    );
}

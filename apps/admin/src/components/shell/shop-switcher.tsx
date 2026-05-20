'use client';

import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/utils/tailwind';

export type ShopSwitcherShop = { name: string; domain: string };

export type ShopSwitcherProps = {
    current: ShopSwitcherShop;
    shops: ShopSwitcherShop[];
};

export function ShopSwitcher({ current, shops }: ShopSwitcherProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                className={cn(
                    'flex h-9 items-center gap-2 rounded-md border-2 border-border bg-background px-3 font-bold text-sm uppercase tracking-wide transition-colors hover:bg-muted',
                )}
            >
                <span className="truncate">{current.name}</span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-56">
                <DropdownMenuLabel>Switch shop</DropdownMenuLabel>
                {shops.map((shop) => {
                    const active = shop.domain === current.domain;
                    return (
                        <DropdownMenuItem key={shop.domain} asChild>
                            <Link
                                href={`/${shop.domain}/` as Route}
                                className="flex w-full items-center justify-between gap-2"
                            >
                                <span>{shop.name}</span>
                                {active ? <Check className="h-4 w-4" /> : null}
                            </Link>
                        </DropdownMenuItem>
                    );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href={'/new' as Route} className="flex w-full items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Connect a new Shop
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

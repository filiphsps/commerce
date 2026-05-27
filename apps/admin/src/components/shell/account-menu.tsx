'use client';

import { LogOut } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type AccountMenuUser = { name?: string; email?: string; image?: string; role: string };

export type AccountMenuProps = { user: AccountMenuUser };

/**
 * Derives two-letter initials from a user's name or email for the avatar fallback.
 *
 * @param user - The account user; name is preferred over email, falls back to '?'.
 * @returns Up to two uppercase initials joined as a string.
 */
function initialsOf(user: AccountMenuUser): string {
    const source = user.name ?? user.email ?? '?';
    return source
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
}

/**
 * Dropdown account menu in the shell header; shows the user's avatar and a sign-out link.
 *
 * @param props.user - Authenticated user whose name, email, and image are displayed.
 */
export function AccountMenu({ user }: AccountMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger aria-label="Account" className="flex items-center rounded-full">
                <Avatar>
                    {user.image ? <AvatarImage src={user.image} alt={user.name ?? user.email ?? 'Account'} /> : null}
                    <AvatarFallback>{initialsOf(user)}</AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
                <DropdownMenuLabel>
                    <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-sm uppercase tracking-wide">{user.name ?? user.email}</span>
                        {user.email ? (
                            <span className="font-normal text-muted-foreground text-xs normal-case">{user.email}</span>
                        ) : null}
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href={'/accounts' as Route}>Account</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href={'/auth/logout' as Route} className="flex items-center gap-2">
                        <LogOut className="h-4 w-4" />
                        Sign out
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

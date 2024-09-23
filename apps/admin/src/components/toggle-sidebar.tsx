'use client';

import { cn } from '@/utils/tailwind';
import { Menu } from 'lucide-react';

import { useHeaderMenu } from '@/components/header-provider';

import type { HTMLAttributes } from 'react';

export type ToggleSidebarProps = {} & Omit<HTMLAttributes<HTMLButtonElement>, 'type' | 'children'>;
export function ToggleSidebar({ className }: ToggleSidebarProps) {
    const { menu, setMenu } = useHeaderMenu();

    return (
        <button className={cn('flex gap-2 md:hidden', className)} onClick={() => setMenu(!menu)}>
            <Menu />
            Menu
        </button>
    );
}

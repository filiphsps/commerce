'use client';

import { Menu } from 'lucide-react';
import type { HTMLAttributes } from 'react';

import { useHeaderMenu } from '@/components/header-provider';
import { cn } from '@/utils/tailwind';

export type ToggleSidebarProps = {} & Omit<HTMLAttributes<HTMLButtonElement>, 'type' | 'children'>;
export function ToggleSidebar({ className }: ToggleSidebarProps) {
    const { menu, setMenu } = useHeaderMenu();

    return (
        <button title="Menu" className={cn('flex gap-2 md:hidden', className)} onClick={() => setMenu(!menu)}>
            <Menu />
        </button>
    );
}

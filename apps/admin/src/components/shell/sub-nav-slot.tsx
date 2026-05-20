'use client';

import type { ReactNode } from 'react';

import { ScrollArea } from '@/components/ui/scroll-area';

export function SubNavSlot({ children }: { children: ReactNode }) {
    return (
        <aside className="flex h-full min-w-0 flex-col border-0 border-border border-r-2 bg-background">
            <ScrollArea className="h-full">
                <div className="flex flex-col gap-1 p-3">{children}</div>
            </ScrollArea>
        </aside>
    );
}

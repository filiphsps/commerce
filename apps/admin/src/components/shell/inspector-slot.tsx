'use client';

import type { ReactNode } from 'react';

import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * Scrollable aside panel for the inspector parallel-route slot in the admin shell.
 *
 * @param props.children - Inspector content rendered inside the scrollable region.
 */
export function InspectorSlot({ children }: { children: ReactNode }) {
    return (
        <aside className="flex h-full min-w-0 flex-col border-0 border-border border-l-2 bg-background">
            <ScrollArea className="h-full">
                <div className="flex flex-col gap-4 p-4">{children}</div>
            </ScrollArea>
        </aside>
    );
}

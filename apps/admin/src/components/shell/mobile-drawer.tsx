'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';

import { cn } from '@/utils/tailwind';

export type MobileDrawerProps = {
    side: 'left' | 'right';
    trigger: ReactNode;
    /** Optional title for a11y; rendered visually-hidden if not provided as visible. */
    title?: string;
    children: ReactNode;
};

export function MobileDrawer({ side, trigger, title = 'Menu', children }: MobileDrawerProps) {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    // Close on route change.
    useEffect(() => {
        void pathname;

        setOpen(false);
    }, [pathname]);

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 fixed inset-0 z-40 bg-black/60 backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in" />
                <Dialog.Content
                    className={cn(
                        'fixed inset-y-0 z-50 flex w-80 max-w-[85vw] flex-col border-0 border-border bg-background shadow-lg',
                        side === 'left' && 'left-0 border-r-2',
                        side === 'right' && 'right-0 border-l-2',
                        'data-[state=closed]:animate-out data-[state=open]:animate-in',
                        side === 'left' && 'data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
                        side === 'right' &&
                            'data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
                    )}
                >
                    <Dialog.Title className="sr-only">{title}</Dialog.Title>
                    <div className="flex-1 overflow-y-auto p-3">{children}</div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

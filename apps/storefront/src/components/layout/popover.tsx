'use client';

import * as Dialog from '@radix-ui/react-dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { X as XIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/actionable/button';
import { Label } from '@/components/typography/label';

export type PopoverProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: ReactNode;
    description?: ReactNode;
    children: ReactNode;
};

export function Popover({ open, onOpenChange, title, description, children }: PopoverProps) {
    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange} modal={true}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-20 bg-black/40" />
                <Dialog.Content asChild={true}>
                    <div className="fixed top-1/2 left-1/2 z-30 flex max-h-[80vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-3 overflow-y-auto rounded-lg border border-gray-200 border-solid bg-white p-4 shadow-lg">
                        <header className="flex items-center justify-between gap-2">
                            <Dialog.Title asChild={true}>
                                <Label className="font-bold text-base leading-none">{title}</Label>
                            </Dialog.Title>
                            <Dialog.Close asChild={true}>
                                <Button
                                    aria-label="Close"
                                    title="Close"
                                    className="flex size-6 items-center justify-center text-gray-600 transition-colors hover:text-black"
                                    styled={false}
                                >
                                    <XIcon className="size-full stroke-2 text-inherit" />
                                </Button>
                            </Dialog.Close>
                        </header>

                        {description ? (
                            <VisuallyHidden.Root>
                                <Dialog.Description>{description}</Dialog.Description>
                            </VisuallyHidden.Root>
                        ) : null}

                        <div>{children}</div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

Popover.displayName = 'Nordcom.Layout.Popover';

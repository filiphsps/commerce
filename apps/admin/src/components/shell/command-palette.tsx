'use client';

import * as Dialog from '@radix-ui/react-dialog';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

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

export function CommandPalette({ items }: CommandPaletteProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);

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

    const grouped = useMemo(() => {
        const map = new Map<string, CommandPaletteItem[]>();
        for (const item of items) {
            const list = map.get(item.group) ?? [];
            list.push(item);
            map.set(item.group, list);
        }
        return [...map.entries()];
    }, [items]);

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
                <Dialog.Content className="fixed top-[20%] left-1/2 z-50 w-[640px] max-w-[90vw] -translate-x-1/2 overflow-hidden rounded-lg border-2 border-border bg-popover shadow-2xl">
                    <Dialog.Title className="sr-only">Command Palette</Dialog.Title>
                    <Command label="Command Menu">
                        <CommandInput placeholder="Type a command or search…" />
                        <CommandList>
                            <CommandEmpty>No results.</CommandEmpty>
                            {grouped.map(([group, list]) => (
                                <CommandGroup key={group} heading={group}>
                                    {list.map((item) => (
                                        <CommandItem
                                            key={item.id}
                                            value={`${item.label} ${(item.keywords ?? []).join(' ')}`}
                                            onSelect={() => {
                                                setOpen(false);
                                                router.push(item.href);
                                            }}
                                        >
                                            {item.icon}
                                            {item.label}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            ))}
                        </CommandList>
                    </Command>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

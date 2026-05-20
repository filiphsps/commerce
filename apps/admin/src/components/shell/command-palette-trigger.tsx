'use client';

import { Search } from 'lucide-react';

import { Kbd } from '@/components/ui/kbd';

export function CommandPaletteTrigger() {
    return (
        <button
            type="button"
            aria-label="Search and navigate"
            className="flex h-9 items-center gap-2 rounded-md border-2 border-border bg-background px-3 font-medium text-muted-foreground text-sm transition-colors hover:bg-muted"
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
        >
            <Search className="h-4 w-4" />
            <span className="hidden md:inline">Search…</span>
            <Kbd className="ml-2 hidden md:inline-flex">⌘K</Kbd>
        </button>
    );
}

'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';

type BulkSelectionContextValue = {
    selectedIds: Set<string>;
    toggle: (id: string) => void;
    clearAll: () => void;
};

const BulkSelectionContext = createContext<BulkSelectionContextValue | null>(null);

export function useBulkSelection(): BulkSelectionContextValue {
    const ctx = useContext(BulkSelectionContext);
    if (!ctx) {
        throw new Error('useBulkSelection must be used within a <BulkSelectionProvider>');
    }
    return ctx;
}

export type BulkSelectionProviderProps = {
    children: ReactNode;
};

export function BulkSelectionProvider({ children }: BulkSelectionProviderProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggle = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const clearAll = () => setSelectedIds(new Set());

    return (
        <BulkSelectionContext.Provider value={{ selectedIds, toggle, clearAll }}>
            {children}
        </BulkSelectionContext.Provider>
    );
}

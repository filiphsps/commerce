'use client';

import { MissingContextProviderError } from '@nordcom/commerce-errors';
import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';

type BulkSelectionContextValue = {
    selectedIds: Set<string>;
    toggle: (id: string) => void;
    clearAll: () => void;
};

const BulkSelectionContext = createContext<BulkSelectionContextValue | null>(null);

/**
 * Returns the nearest BulkSelectionContext; throws when no provider is in the tree.
 *
 * @returns The context value containing selectedIds, toggle, and clearAll.
 * @throws {MissingContextProviderError} When called outside a BulkSelectionProvider.
 */
export function useBulkSelection(): BulkSelectionContextValue {
    const ctx = useContext(BulkSelectionContext);
    if (!ctx) {
        throw new MissingContextProviderError('useBulkSelection', 'BulkSelectionProvider');
    }
    return ctx;
}

export type BulkSelectionProviderProps = {
    children: ReactNode;
};

/**
 * Provides row-checkbox selection state to all descendant BulkActions and RowCheckbox components.
 *
 * @param props.children - Content tree that needs access to the selection context.
 */
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

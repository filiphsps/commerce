'use client';

import { useBulkSelection } from '@/components/cms/bulk-selection-provider';

export type RowCheckboxProps = {
    rowId: string;
    /**
     * Human-readable label for accessibility. Falls back to "row <rowId>" when
     * absent — fine for fixtures, less so for production (ObjectIds).
     */
    rowLabel?: string;
};

export function RowCheckbox({ rowId, rowLabel }: RowCheckboxProps) {
    const { selectedIds, toggle } = useBulkSelection();

    const label = rowLabel ? `Select ${rowLabel}` : `Select row ${rowId}`;

    return (
        <input
            type="checkbox"
            aria-label={label}
            checked={selectedIds.has(rowId)}
            onChange={() => toggle(rowId)}
            className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
        />
    );
}

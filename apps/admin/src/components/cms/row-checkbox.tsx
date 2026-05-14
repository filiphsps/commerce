'use client';

import { useBulkSelection } from '@/components/cms/bulk-selection-provider';

export type RowCheckboxProps = {
    rowId: string;
};

export function RowCheckbox({ rowId }: RowCheckboxProps) {
    const { selectedIds, toggle } = useBulkSelection();

    return (
        <input
            type="checkbox"
            aria-label={`Select row ${rowId}`}
            checked={selectedIds.has(rowId)}
            onChange={() => toggle(rowId)}
            className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
        />
    );
}

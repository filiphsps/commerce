import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { BulkSelectionProvider } from '@/components/cms/bulk-selection-provider';
import { RowCheckbox } from '@/components/cms/row-checkbox';

export type Column<TRow> = {
    label: string;
    /**
     * Property name on the row, or a function that returns the cell value.
     * String form is type-checked against `keyof TRow`; function form is
     * useful when the cell value is derived from multiple fields.
     */
    accessor: (keyof TRow & string) | ((row: TRow) => string | null);
    /**
     * Optional cell renderer. Receives the resolved accessor value and the
     * full row. Default rendering coerces the value with `String(value ?? '')`.
     */
    render?: (value: unknown, row: TRow) => ReactNode;
};

export type CollectionTableProps<TRow extends { id: string | number }> = {
    rows: TRow[];
    columns: Column<TRow>[];
    getRowHref: (row: TRow) => Route;
    /**
     * Human-readable label per row for screen readers (drives the checkbox and
     * trailing "Edit" link aria-labels). Defaults to the stringified id, which
     * is unhelpful for ObjectIds in production — pass the row's title/name when
     * possible.
     */
    getRowLabel?: (row: TRow) => string;
    /**
     * Pass `<BulkActions>` here. When `selectable` is true the table wraps the
     * tree in `<BulkSelectionProvider>` automatically, so the BulkActions
     * component (and any `<RowCheckbox>` cells the table renders) can read
     * shared selection state via context. Rendering `<BulkActions>` outside
     * this slot will throw the context guard in `useBulkSelection`.
     */
    bulkActions?: ReactNode;
    selectable?: boolean;
    emptyMessage?: string;
    /** Sets `aria-label` on the underlying `<table>`. Defaults to 'Collection items'. */
    ariaLabel?: string;
};

/**
 * Stable React key for a column: the string accessor when present, or
 * `fn:<index>` for function-form accessors. Function accessors can't be
 * compared by identity across renders, but the column array is positional, so
 * the index is a sufficient discriminator.
 *
 * @param col - Column definition to generate a key for.
 * @param index - Positional index in the columns array; used as the discriminator for function-form accessors.
 * @returns The string accessor value, or `` `fn:${index}` `` for function-form accessors.
 */
function columnKey<TRow>(col: Column<TRow>, index: number): string {
    return typeof col.accessor === 'function' ? `fn:${index}` : col.accessor;
}

/**
 * Resolves a column's cell value for the given row using either the string accessor or the function accessor.
 *
 * @param col - Column definition whose accessor drives the lookup.
 * @param row - The row being rendered.
 * @returns The resolved cell value (may be null for function-form accessors).
 */
function resolveCellValue<TRow>(col: Column<TRow>, row: TRow): unknown {
    return typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor];
}

/**
 * Data table for CMS collection list pages with optional row checkboxes for bulk operations.
 *
 * Renders columns, a trailing "Edit" link per row, and wraps the tree in BulkSelectionProvider
 * automatically when selectable is true.
 *
 * @param props.rows - Array of data objects to display; each must have an id field.
 * @param props.columns - Column definitions controlling header labels and cell rendering.
 * @param props.getRowHref - Returns the edit route for a given row.
 * @param props.getRowLabel - Human-readable label per row for screen readers.
 * @param props.bulkActions - BulkActions slot; rendered only when selectable is true and rows exist.
 * @param props.selectable - When true, renders row checkboxes and wraps in BulkSelectionProvider.
 * @param props.emptyMessage - Message displayed when the rows array is empty.
 * @param props.ariaLabel - aria-label on the underlying table element.
 */
export function CollectionTable<TRow extends { id: string | number }>({
    rows,
    columns,
    getRowHref,
    getRowLabel,
    selectable = false,
    bulkActions,
    emptyMessage = 'No items.',
    ariaLabel = 'Collection items',
}: CollectionTableProps<TRow>) {
    const content = (
        <div className="flex flex-col gap-3">
            {selectable && rows.length > 0 && bulkActions ? <div>{bulkActions}</div> : null}

            <div className="w-full overflow-x-auto rounded-lg border-2 border-border border-solid bg-card">
                <table aria-label={ariaLabel} className="w-full text-sm">
                    <thead className="border-0 border-border border-b-2 border-solid bg-muted/50">
                        <tr>
                            {selectable ? (
                                <th className="w-10 px-4 py-3 text-left" scope="col">
                                    <span className="sr-only">Select</span>
                                </th>
                            ) : null}
                            {columns.map((col, colIndex) => (
                                <th
                                    key={columnKey(col, colIndex)}
                                    scope="col"
                                    className="px-4 py-3 text-left font-semibold text-muted-foreground"
                                >
                                    {col.label}
                                </th>
                            ))}
                            <th className="w-10 px-4 py-3" scope="col">
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length + (selectable ? 2 : 1)}
                                    className="px-4 py-8 text-center text-muted-foreground"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            rows.map((row) => {
                                const rowIdStr = String(row.id);
                                const rowLabel = getRowLabel?.(row);
                                const editLabel = rowLabel ? `Edit ${rowLabel}` : `Edit row ${rowIdStr}`;

                                return (
                                    <tr key={rowIdStr} className="transition-colors hover:bg-muted/30">
                                        {selectable ? (
                                            <td className="px-4 py-3">
                                                <RowCheckbox rowId={rowIdStr} rowLabel={rowLabel} />
                                            </td>
                                        ) : null}
                                        {columns.map((col, colIndex) => {
                                            const value = resolveCellValue(col, row);
                                            const rendered = col.render ? col.render(value, row) : String(value ?? '');
                                            return (
                                                <td
                                                    key={columnKey(col, colIndex)}
                                                    className="px-4 py-3 text-foreground"
                                                >
                                                    {colIndex === 0 ? (
                                                        <Link
                                                            href={getRowHref(row)}
                                                            className="font-medium hover:text-primary hover:underline"
                                                        >
                                                            {rendered}
                                                        </Link>
                                                    ) : (
                                                        rendered
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="px-4 py-3 text-right">
                                            <Link
                                                href={getRowHref(row)}
                                                aria-label={editLabel}
                                                className="text-muted-foreground text-xs hover:text-primary"
                                            >
                                                Edit
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    if (selectable) {
        return <BulkSelectionProvider>{content}</BulkSelectionProvider>;
    }

    return content;
}

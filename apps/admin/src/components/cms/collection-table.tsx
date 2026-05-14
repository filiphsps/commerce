import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { BulkSelectionProvider } from '@/components/cms/bulk-selection-provider';
import { RowCheckbox } from '@/components/cms/row-checkbox';

export type Column<TRow> = {
    key: string;
    label: string;
    render?: (row: TRow) => ReactNode;
};

export type CollectionTableProps<TRow extends { id: string | number }> = {
    rows: TRow[];
    columns: Column<TRow>[];
    getRowHref: (row: TRow) => Route;
    selectable?: boolean;
    bulkActions?: ReactNode;
    emptyMessage?: string;
};

export function CollectionTable<TRow extends { id: string | number }>({
    rows,
    columns,
    getRowHref,
    selectable = false,
    bulkActions,
    emptyMessage = 'No items.',
}: CollectionTableProps<TRow>) {
    const content = (
        <div className="flex flex-col gap-3">
            {selectable && rows.length > 0 && bulkActions ? <div>{bulkActions}</div> : null}

            <div className="w-full overflow-x-auto rounded-lg border-2 border-border border-solid bg-card">
                <table className="w-full text-sm">
                    <thead className="border-0 border-border border-b-2 border-solid bg-muted/50">
                        <tr>
                            {selectable ? (
                                <th className="w-10 px-4 py-3 text-left" scope="col">
                                    <span className="sr-only">Select</span>
                                </th>
                            ) : null}
                            {columns.map((col) => (
                                <th
                                    key={col.key}
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
                            rows.map((row) => (
                                <tr key={String(row.id)} className="transition-colors hover:bg-muted/30">
                                    {selectable ? (
                                        <td className="px-4 py-3">
                                            <RowCheckbox rowId={String(row.id)} />
                                        </td>
                                    ) : null}
                                    {columns.map((col, colIndex) => (
                                        <td key={col.key} className="px-4 py-3 text-foreground">
                                            {colIndex === 0 ? (
                                                <Link
                                                    href={getRowHref(row)}
                                                    className="font-medium hover:text-primary hover:underline"
                                                >
                                                    {col.render
                                                        ? col.render(row)
                                                        : String((row as Record<string, unknown>)[col.key] ?? '')}
                                                </Link>
                                            ) : col.render ? (
                                                col.render(row)
                                            ) : (
                                                String((row as Record<string, unknown>)[col.key] ?? '')
                                            )}
                                        </td>
                                    ))}
                                    <td className="px-4 py-3 text-right">
                                        <Link
                                            href={getRowHref(row)}
                                            className="text-muted-foreground text-xs hover:text-primary"
                                        >
                                            Edit
                                        </Link>
                                    </td>
                                </tr>
                            ))
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

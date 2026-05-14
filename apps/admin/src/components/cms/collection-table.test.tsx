import { act, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BulkActions } from '@/components/cms/bulk-actions';
import { CollectionTable } from '@/components/cms/collection-table';
import { render, screen } from '@/utils/test/react';

// ------------------------------------------------------------------
// Mock next/link so it renders as a plain <a> in happy-dom.
// ------------------------------------------------------------------

vi.mock('next/link', () => ({
    default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
        <a href={String(href)} {...rest}>
            {children}
        </a>
    ),
}));

// ------------------------------------------------------------------
// Mock @nordcom/nordstar — imports CSS that vitest can't handle.
// ------------------------------------------------------------------

vi.mock('@nordcom/nordstar', () => ({
    Button: ({
        children,
        disabled,
        onClick,
    }: {
        children: React.ReactNode;
        disabled?: boolean;
        onClick?: () => void;
    }) => (
        <button type="button" disabled={disabled} onClick={onClick}>
            {children}
        </button>
    ),
}));

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

type TestRow = { id: string; title: string; status: string };

const COLUMNS = [
    { key: 'title' as const, label: 'Title' },
    { key: 'status' as const, label: 'Status' },
];

const ROWS: TestRow[] = [
    { id: 'row-1', title: 'Article One', status: 'published' },
    { id: 'row-2', title: 'Article Two', status: 'draft' },
    { id: 'row-3', title: 'Article Three', status: 'draft' },
];

function getHref(row: TestRow) {
    return `/content/${row.id}/` as import('next').Route;
}

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe('CollectionTable', () => {
    it('renders all rows with their cell content', () => {
        render(<CollectionTable rows={ROWS} columns={COLUMNS} getRowHref={getHref} />);

        expect(screen.getByText('Article One')).toBeInTheDocument();
        expect(screen.getByText('Article Two')).toBeInTheDocument();
        expect(screen.getByText('Article Three')).toBeInTheDocument();
        expect(screen.getAllByText('published')).toHaveLength(1);
        expect(screen.getAllByText('draft')).toHaveLength(2);
    });

    it('renders column headers', () => {
        render(<CollectionTable rows={ROWS} columns={COLUMNS} getRowHref={getHref} />);

        expect(screen.getByText('Title')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('shows the default empty message when rows is empty', () => {
        render(<CollectionTable rows={[]} columns={COLUMNS} getRowHref={getHref} />);

        expect(screen.getByText('No items.')).toBeInTheDocument();
    });

    it('shows a custom emptyMessage when rows is empty', () => {
        render(<CollectionTable rows={[]} columns={COLUMNS} getRowHref={getHref} emptyMessage="Nothing here yet." />);

        expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
    });

    it('renders checkboxes when selectable=true', () => {
        render(<CollectionTable rows={ROWS} columns={COLUMNS} getRowHref={getHref} selectable />);

        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes).toHaveLength(ROWS.length);
    });

    it('checking a row checkbox updates its checked state', () => {
        render(<CollectionTable rows={ROWS} columns={COLUMNS} getRowHref={getHref} selectable />);

        const checkboxes = screen.getAllByRole('checkbox');
        const first = checkboxes[0]!;

        expect(first).not.toBeChecked();
        fireEvent.click(first);
        expect(first).toBeChecked();
        fireEvent.click(first);
        expect(first).not.toBeChecked();
    });

    it('calls deleteAction with selected ids when Delete selected is clicked', async () => {
        const deleteAction = vi.fn().mockResolvedValue(undefined);

        render(
            <CollectionTable
                rows={ROWS}
                columns={COLUMNS}
                getRowHref={getHref}
                selectable
                bulkActions={<BulkActions deleteAction={deleteAction} />}
            />,
        );

        // Select first two rows.
        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]!);
        fireEvent.click(checkboxes[1]!);

        // Now the toolbar should show the Delete button.
        const deleteBtn = screen.getByRole('button', { name: /delete selected/i });
        expect(deleteBtn).not.toBeDisabled();

        await act(async () => {
            fireEvent.click(deleteBtn);
        });

        await vi.waitFor(() => {
            expect(deleteAction).toHaveBeenCalledTimes(1);
        });

        expect(deleteAction).toHaveBeenCalledWith(expect.arrayContaining(['row-1', 'row-2']));
        expect(deleteAction.mock.calls[0]![0]).toHaveLength(2);
    });

    it('clears selection after a successful deleteAction', async () => {
        const deleteAction = vi.fn().mockResolvedValue(undefined);

        render(
            <CollectionTable
                rows={ROWS}
                columns={COLUMNS}
                getRowHref={getHref}
                selectable
                bulkActions={<BulkActions deleteAction={deleteAction} />}
            />,
        );

        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]!);
        fireEvent.click(checkboxes[1]!);

        expect(checkboxes[0]).toBeChecked();
        expect(checkboxes[1]).toBeChecked();

        const deleteBtn = screen.getByRole('button', { name: /delete selected/i });
        await act(async () => {
            fireEvent.click(deleteBtn);
        });

        await vi.waitFor(() => {
            expect(deleteAction).toHaveBeenCalledTimes(1);
        });

        // After the action resolves, clearAll() should have unticked everything.
        await vi.waitFor(() => {
            const post = screen.getAllByRole('checkbox');
            expect(post[0]).not.toBeChecked();
            expect(post[1]).not.toBeChecked();
            expect(post[2]).not.toBeChecked();
        });
    });

    it('calls publishAction with selected ids when Publish selected is clicked', async () => {
        const publishAction = vi.fn().mockResolvedValue(undefined);

        render(
            <CollectionTable
                rows={ROWS}
                columns={COLUMNS}
                getRowHref={getHref}
                selectable
                bulkActions={<BulkActions publishAction={publishAction} />}
            />,
        );

        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[2]!);

        const publishBtn = screen.getByRole('button', { name: /publish selected/i });

        await act(async () => {
            fireEvent.click(publishBtn);
        });

        await vi.waitFor(() => {
            expect(publishAction).toHaveBeenCalledTimes(1);
        });

        expect(publishAction).toHaveBeenCalledWith(['row-3']);
    });

    it('disables the Delete button while the transition is in flight, then re-enables', async () => {
        // Manual deferred so we control when the server action settles.
        let resolveDelete: () => void = () => undefined;
        const deletePromise = new Promise<void>((resolve) => {
            resolveDelete = resolve;
        });
        const deleteAction = vi.fn().mockReturnValue(deletePromise);

        render(
            <CollectionTable
                rows={ROWS}
                columns={COLUMNS}
                getRowHref={getHref}
                selectable
                bulkActions={<BulkActions deleteAction={deleteAction} />}
            />,
        );

        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]!);

        const deleteBtn = screen.getByRole('button', { name: /delete selected/i });
        expect(deleteBtn).not.toBeDisabled();

        await act(async () => {
            fireEvent.click(deleteBtn);
        });

        // Action is still pending → button must be disabled.
        await vi.waitFor(() => {
            expect(screen.getByRole('button', { name: /delete selected/i })).toBeDisabled();
        });

        // Settle the action and confirm we recover (clearAll runs, count → 0,
        // which itself also disables the button — that's expected behaviour).
        await act(async () => {
            resolveDelete();
            await deletePromise;
        });

        await vi.waitFor(() => {
            expect(deleteAction).toHaveBeenCalledTimes(1);
        });
    });

    it('shows an inline error and keeps selection when deleteAction rejects', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const deleteAction = vi.fn().mockRejectedValue(new Error('boom'));

        render(
            <CollectionTable
                rows={ROWS}
                columns={COLUMNS}
                getRowHref={getHref}
                selectable
                bulkActions={<BulkActions deleteAction={deleteAction} />}
            />,
        );

        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]!);

        const deleteBtn = screen.getByRole('button', { name: /delete selected/i });
        await act(async () => {
            fireEvent.click(deleteBtn);
        });

        await vi.waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('boom');
        });

        // Selection is preserved so the user can retry.
        const after = screen.getAllByRole('checkbox');
        expect(after[0]).toBeChecked();

        consoleError.mockRestore();
    });

    it('clears the inline error when the selection changes after a failure', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const deleteAction = vi.fn().mockRejectedValue(new Error('boom'));

        render(
            <CollectionTable
                rows={ROWS}
                columns={COLUMNS}
                getRowHref={getHref}
                selectable
                bulkActions={<BulkActions deleteAction={deleteAction} />}
            />,
        );

        const checkboxes = screen.getAllByRole('checkbox');
        fireEvent.click(checkboxes[0]!);

        const deleteBtn = screen.getByRole('button', { name: /delete selected/i });
        await act(async () => {
            fireEvent.click(deleteBtn);
        });

        await vi.waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('boom');
        });

        // Toggle a different checkbox — the stale error must disappear because
        // it referred to the previous set of ids.
        await act(async () => {
            fireEvent.click(screen.getAllByRole('checkbox')[1]!);
        });

        await vi.waitFor(() => {
            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        });

        consoleError.mockRestore();
    });

    it('does not render checkboxes when selectable is false', () => {
        render(<CollectionTable rows={ROWS} columns={COLUMNS} getRowHref={getHref} selectable={false} />);

        expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });

    it('applies a custom ariaLabel to the underlying table', () => {
        render(<CollectionTable rows={ROWS} columns={COLUMNS} getRowHref={getHref} ariaLabel="Articles" />);

        expect(screen.getByRole('table', { name: 'Articles' })).toBeInTheDocument();
    });

    it('uses getRowLabel to label the checkbox and trailing Edit link', () => {
        render(
            <CollectionTable
                rows={ROWS}
                columns={COLUMNS}
                getRowHref={getHref}
                getRowLabel={(row) => row.title}
                selectable
            />,
        );

        // Checkbox aria-label comes from the row title, not the raw id.
        expect(screen.getByRole('checkbox', { name: 'Select Article One' })).toBeInTheDocument();
        // Trailing Edit link aria-label likewise.
        expect(screen.getByRole('link', { name: 'Edit Article One' })).toBeInTheDocument();
    });
});

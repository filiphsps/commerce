'use client';

import { Button } from '@nordcom/nordstar';
import { useTransition } from 'react';

import { useBulkSelection } from '@/components/cms/bulk-selection-provider';

export type BulkActionsProps = {
    deleteAction?: (ids: string[]) => Promise<void>;
    publishAction?: (ids: string[]) => Promise<void>;
};

export function BulkActions({ deleteAction, publishAction }: BulkActionsProps) {
    const { selectedIds, clearAll } = useBulkSelection();
    const [isPending, startTransition] = useTransition();

    const count = selectedIds.size;
    const ids = Array.from(selectedIds);
    const disabled = count === 0 || isPending;

    const handleDelete = () => {
        if (!deleteAction || disabled) return;
        startTransition(async () => {
            await deleteAction(ids);
            clearAll();
        });
    };

    const handlePublish = () => {
        if (!publishAction || disabled) return;
        startTransition(async () => {
            await publishAction(ids);
            clearAll();
        });
    };

    return (
        <div className="flex items-center gap-3 rounded-md border-2 border-border border-solid bg-muted px-4 py-2">
            <span className="text-muted-foreground text-sm">{count} selected</span>

            {publishAction && (
                <Button
                    as="button"
                    type="button"
                    variant="outline"
                    color="primary"
                    disabled={disabled}
                    onClick={handlePublish}
                >
                    Publish selected
                </Button>
            )}

            {deleteAction && (
                <Button
                    as="button"
                    type="button"
                    variant="solid"
                    color="danger"
                    disabled={disabled}
                    onClick={handleDelete}
                >
                    Delete selected
                </Button>
            )}
        </div>
    );
}

'use client';

import { Button } from '@nordcom/nordstar';
import { useState, useTransition } from 'react';

import { useBulkSelection } from '@/components/cms/bulk-selection-provider';

export type BulkActionsProps = {
    deleteAction?: (ids: string[]) => Promise<void>;
    publishAction?: (ids: string[]) => Promise<void>;
};

export function BulkActions({ deleteAction, publishAction }: BulkActionsProps) {
    const { selectedIds, clearAll } = useBulkSelection();
    const [isPending, startTransition] = useTransition();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const count = selectedIds.size;
    const ids = Array.from(selectedIds);
    const disabled = count === 0 || isPending;

    const runAction = (action: (ids: string[]) => Promise<void>, fallbackMessage: string) => {
        setErrorMessage(null);
        startTransition(async () => {
            try {
                await action(ids);
                clearAll();
            } catch (err) {
                console.error(err);
                setErrorMessage(err instanceof Error ? err.message : fallbackMessage);
            }
        });
    };

    const handleDelete = () => {
        if (!deleteAction || disabled) return;
        runAction(deleteAction, 'Failed to delete items.');
    };

    const handlePublish = () => {
        if (!publishAction || disabled) return;
        runAction(publishAction, 'Failed to publish items.');
    };

    return (
        <div className="flex flex-col gap-2 rounded-md border-2 border-border border-solid bg-muted px-4 py-2">
            <div className="flex items-center gap-3">
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

            {errorMessage ? (
                <p role="alert" className="text-destructive text-sm">
                    {errorMessage}
                </p>
            ) : null}
        </div>
    );
}

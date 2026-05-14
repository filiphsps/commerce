'use client';

import { Button } from '@nordcom/nordstar';
import { useEffect, useState, useTransition } from 'react';

/** How often (ms) to re-render the toolbar so the relative timestamp stays fresh. */
const RELATIVE_TIME_TICK_MS = 30_000;

/** Returns a human-readable relative-time string such as "2 minutes ago". */
export function formatRelativeTime(date: Date | string): string {
    const ms = Date.now() - new Date(date).getTime();
    const seconds = Math.round(ms / 1000);

    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds} seconds ago`;

    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
}

export type DraftPublishToolbarProps = {
    /**
     * Server action that saves the current form state as a draft (`_status: 'draft'`).
     * Suffixed `Action` to satisfy Next 16's `'use client'` server-action prop rule
     * — passing a non-suffixed callable across the RSC boundary trips the linter.
     */
    saveDraftAction: () => Promise<void>;
    /**
     * Server action that publishes the current form state (`_status: 'published'`).
     * See `saveDraftAction` JSDoc for the naming-convention rationale.
     */
    publishAction: () => Promise<void>;
    /** ISO string or Date of the last save (draft or publish). Undefined = never saved. */
    lastSavedAt?: Date | string;
    /** Whether an autosave is currently in flight — shown next to the timestamp. */
    isSaving?: boolean;
};

/**
 * Sticky bottom toolbar for document edit pages.
 *
 * Renders two buttons — "Save Draft" and "Publish" — each guarded by its own
 * `useTransition` so they disable independently during their pending state.
 * Mirrors the `runAction` pattern from `<BulkActions>` for error handling.
 */
export function DraftPublishToolbar({
    saveDraftAction,
    publishAction,
    lastSavedAt,
    isSaving,
}: DraftPublishToolbarProps) {
    const [isDraftPending, startDraftTransition] = useTransition();
    const [isPublishPending, startPublishTransition] = useTransition();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Tick counter to force a re-render every 30s so the "X seconds ago" string
    // stays fresh while the page sits idle. Only active when there's a timestamp
    // to display — no interval runs before the first save.
    const [, setTick] = useState(0);
    useEffect(() => {
        if (!lastSavedAt) return;
        const id = setInterval(() => setTick((n) => n + 1), RELATIVE_TIME_TICK_MS);
        return () => clearInterval(id);
    }, [lastSavedAt]);

    const runAction = (action: () => Promise<void>, fallback: string, start: typeof startDraftTransition) => {
        setErrorMessage(null);
        start(async () => {
            try {
                await action();
            } catch (err) {
                console.error(err);
                setErrorMessage(err instanceof Error ? err.message : fallback);
            }
        });
    };

    const handleSaveDraft = () => {
        runAction(saveDraftAction, 'Failed to save draft.', startDraftTransition);
    };

    const handlePublish = () => {
        runAction(publishAction, 'Failed to publish.', startPublishTransition);
    };

    return (
        <div className="flex w-full flex-col gap-2">
            <div className="flex items-center gap-3">
                {/* ── Status indicator ── */}
                <div className="flex-1">
                    {isSaving ? (
                        <span className="text-muted-foreground text-sm">Saving…</span>
                    ) : lastSavedAt ? (
                        <span className="text-muted-foreground text-sm">
                            Last saved {formatRelativeTime(lastSavedAt)}
                        </span>
                    ) : null}
                </div>

                {/* ── Action buttons ── */}
                <div className="flex items-center gap-3">
                    <Button
                        as="button"
                        type="button"
                        variant="outline"
                        color="foreground"
                        disabled={isDraftPending || isPublishPending}
                        onClick={handleSaveDraft}
                    >
                        Save Draft
                    </Button>
                    <Button
                        as="button"
                        type="button"
                        variant="solid"
                        color="primary"
                        disabled={isDraftPending || isPublishPending}
                        onClick={handlePublish}
                    >
                        Publish
                    </Button>
                </div>
            </div>

            {errorMessage ? (
                <p role="alert" className="text-destructive text-sm">
                    {errorMessage}
                </p>
            ) : null}
        </div>
    );
}

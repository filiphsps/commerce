import { act, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DraftPublishToolbar, formatRelativeTime } from '@/components/cms/draft-publish-toolbar';
import { render, screen } from '@/utils/test/react';

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
// Tests
// ------------------------------------------------------------------

describe('DraftPublishToolbar', () => {
    it('renders Save Draft and Publish buttons', () => {
        render(<DraftPublishToolbar saveDraftAction={vi.fn()} publishAction={vi.fn()} />);

        expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /publish/i })).toBeInTheDocument();
    });

    it('calls the publish action when Publish is clicked', async () => {
        const publishAction = vi.fn().mockResolvedValue(undefined);

        render(<DraftPublishToolbar saveDraftAction={vi.fn()} publishAction={publishAction} />);

        const btn = screen.getByRole('button', { name: /publish/i });
        await act(async () => {
            fireEvent.click(btn);
        });

        await vi.waitFor(() => {
            expect(publishAction).toHaveBeenCalledTimes(1);
        });
    });

    it('calls the saveDraft action when Save Draft is clicked', async () => {
        const saveDraftAction = vi.fn().mockResolvedValue(undefined);

        render(<DraftPublishToolbar saveDraftAction={saveDraftAction} publishAction={vi.fn()} />);

        const btn = screen.getByRole('button', { name: /save draft/i });
        await act(async () => {
            fireEvent.click(btn);
        });

        await vi.waitFor(() => {
            expect(saveDraftAction).toHaveBeenCalledTimes(1);
        });
    });

    it('disables both buttons while the publish transition is pending', async () => {
        let resolvePublish: () => void = () => undefined;
        const publishPromise = new Promise<void>((res) => {
            resolvePublish = res;
        });
        const publishAction = vi.fn().mockReturnValue(publishPromise);

        render(<DraftPublishToolbar saveDraftAction={vi.fn()} publishAction={publishAction} />);

        const publishBtn = screen.getByRole('button', { name: /publish/i });
        const draftBtn = screen.getByRole('button', { name: /save draft/i });

        await act(async () => {
            fireEvent.click(publishBtn);
        });

        await vi.waitFor(() => {
            expect(screen.getByRole('button', { name: /publish/i })).toBeDisabled();
            expect(screen.getByRole('button', { name: /save draft/i })).toBeDisabled();
        });

        await act(async () => {
            resolvePublish();
            await publishPromise;
        });

        await vi.waitFor(() => {
            expect(publishBtn).not.toBeDisabled();
            expect(draftBtn).not.toBeDisabled();
        });
    });

    it('shows an inline error when publish rejects', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const publishAction = vi.fn().mockRejectedValue(new Error('server error'));

        render(<DraftPublishToolbar saveDraftAction={vi.fn()} publishAction={publishAction} />);

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /publish/i }));
        });

        await vi.waitFor(() => {
            expect(screen.getByRole('alert')).toHaveTextContent('server error');
        });

        consoleError.mockRestore();
    });

    it('clears the error on the next action attempt', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const publishAction = vi.fn().mockRejectedValueOnce(new Error('first failure')).mockResolvedValue(undefined);

        render(<DraftPublishToolbar saveDraftAction={vi.fn()} publishAction={publishAction} />);

        // Trigger failure.
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /publish/i }));
        });

        await vi.waitFor(() => {
            expect(screen.getByRole('alert')).toBeInTheDocument();
        });

        // Second click should clear the error.
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /publish/i }));
        });

        await vi.waitFor(() => {
            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        });

        consoleError.mockRestore();
    });

    it('shows "Saving…" when isSaving is true', () => {
        render(<DraftPublishToolbar saveDraftAction={vi.fn()} publishAction={vi.fn()} isSaving />);

        expect(screen.getByText('Saving…')).toBeInTheDocument();
    });

    it('shows the last-saved timestamp when isSaving is false and lastSavedAt is set', () => {
        const ts = new Date(Date.now() - 5000); // 5 seconds ago
        render(<DraftPublishToolbar saveDraftAction={vi.fn()} publishAction={vi.fn()} lastSavedAt={ts} />);

        expect(screen.getByText(/last saved/i)).toBeInTheDocument();
    });
});

// ------------------------------------------------------------------
// formatRelativeTime — pure helper, exhaustively covered here so the
// component test doesn't have to assert specific phrasing.
// ------------------------------------------------------------------

describe('formatRelativeTime', () => {
    const NOW = new Date('2026-01-15T12:00:00Z');

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns "just now" for timestamps under 5 seconds old', () => {
        expect(formatRelativeTime(new Date(NOW.getTime() - 2000))).toBe('just now');
    });

    it('returns "{n} seconds ago" between 5 and 60 seconds', () => {
        expect(formatRelativeTime(new Date(NOW.getTime() - 30_000))).toBe('30 seconds ago');
    });

    it('returns "1 minute ago" (singular) for exactly 1 minute', () => {
        expect(formatRelativeTime(new Date(NOW.getTime() - 60_000))).toBe('1 minute ago');
    });

    it('returns "{n} minutes ago" (plural) for multiple minutes', () => {
        expect(formatRelativeTime(new Date(NOW.getTime() - 5 * 60_000))).toBe('5 minutes ago');
    });

    it('returns "1 hour ago" (singular) for exactly 1 hour', () => {
        expect(formatRelativeTime(new Date(NOW.getTime() - 60 * 60_000))).toBe('1 hour ago');
    });

    it('returns "{n} hours ago" (plural) for multiple hours', () => {
        expect(formatRelativeTime(new Date(NOW.getTime() - 3 * 60 * 60_000))).toBe('3 hours ago');
    });

    it('returns "1 day ago" (singular) for exactly 1 day', () => {
        expect(formatRelativeTime(new Date(NOW.getTime() - 24 * 60 * 60_000))).toBe('1 day ago');
    });

    it('returns "{n} days ago" (plural) for multiple days', () => {
        expect(formatRelativeTime(new Date(NOW.getTime() - 7 * 24 * 60 * 60_000))).toBe('7 days ago');
    });

    it('accepts a string ISO timestamp as well as a Date', () => {
        expect(formatRelativeTime(new Date(NOW.getTime() - 30_000).toISOString())).toBe('30 seconds ago');
    });
});

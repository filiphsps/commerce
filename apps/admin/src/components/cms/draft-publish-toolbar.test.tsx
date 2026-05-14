import { act, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DraftPublishToolbar } from '@/components/cms/draft-publish-toolbar';
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
        render(<DraftPublishToolbar saveDraft={vi.fn()} publish={vi.fn()} />);

        expect(screen.getByRole('button', { name: /save draft/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /publish/i })).toBeInTheDocument();
    });

    it('calls the publish action when Publish is clicked', async () => {
        const publish = vi.fn().mockResolvedValue(undefined);

        render(<DraftPublishToolbar saveDraft={vi.fn()} publish={publish} />);

        const btn = screen.getByRole('button', { name: /publish/i });
        await act(async () => {
            fireEvent.click(btn);
        });

        await vi.waitFor(() => {
            expect(publish).toHaveBeenCalledTimes(1);
        });
    });

    it('calls the saveDraft action when Save Draft is clicked', async () => {
        const saveDraft = vi.fn().mockResolvedValue(undefined);

        render(<DraftPublishToolbar saveDraft={saveDraft} publish={vi.fn()} />);

        const btn = screen.getByRole('button', { name: /save draft/i });
        await act(async () => {
            fireEvent.click(btn);
        });

        await vi.waitFor(() => {
            expect(saveDraft).toHaveBeenCalledTimes(1);
        });
    });

    it('disables both buttons while the publish transition is pending', async () => {
        let resolvePublish: () => void = () => undefined;
        const publishPromise = new Promise<void>((res) => {
            resolvePublish = res;
        });
        const publish = vi.fn().mockReturnValue(publishPromise);

        render(<DraftPublishToolbar saveDraft={vi.fn()} publish={publish} />);

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
        const publish = vi.fn().mockRejectedValue(new Error('server error'));

        render(<DraftPublishToolbar saveDraft={vi.fn()} publish={publish} />);

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
        const publish = vi.fn().mockRejectedValueOnce(new Error('first failure')).mockResolvedValue(undefined);

        render(<DraftPublishToolbar saveDraft={vi.fn()} publish={publish} />);

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
        render(<DraftPublishToolbar saveDraft={vi.fn()} publish={vi.fn()} isSaving />);

        expect(screen.getByText('Saving…')).toBeInTheDocument();
    });

    it('shows the last-saved timestamp when isSaving is false and lastSavedAt is set', () => {
        const ts = new Date(Date.now() - 5000); // 5 seconds ago
        render(<DraftPublishToolbar saveDraft={vi.fn()} publish={vi.fn()} lastSavedAt={ts} />);

        expect(screen.getByText(/last saved/i)).toBeInTheDocument();
    });
});

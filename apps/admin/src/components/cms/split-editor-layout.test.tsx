import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SplitEditorLayout } from '@/components/cms/split-editor-layout';
import { render, screen } from '@/utils/test/react';

describe('SplitEditorLayout', () => {
    describe('without a preview', () => {
        it('renders a single scrollable field column and no view switch', () => {
            render(
                <SplitEditorLayout>
                    <p>field</p>
                </SplitEditorLayout>,
            );
            expect(screen.getByText('field')).toBeInTheDocument();
            expect(screen.queryByTestId('editor-view-edit')).not.toBeInTheDocument();
            expect(screen.queryByTestId('editor-pane-preview')).not.toBeInTheDocument();
        });
    });

    describe('with a preview', () => {
        const renderSplit = () =>
            render(
                <SplitEditorLayout preview={<div data-testid="the-preview">preview</div>}>
                    <p>field</p>
                </SplitEditorLayout>,
            );

        it('mounts both panes and the live preview at once', () => {
            renderSplit();
            expect(screen.getByTestId('editor-pane-fields')).toBeInTheDocument();
            expect(screen.getByTestId('editor-pane-preview')).toBeInTheDocument();
            // The preview iframe stays mounted in both views so its live bridge survives.
            expect(screen.getByTestId('the-preview')).toBeInTheDocument();
        });

        it('keeps both panes visible on lg+ regardless of the active mobile view', () => {
            renderSplit();
            // The `lg:flex` token un-hides each pane at the side-by-side breakpoint.
            expect(screen.getByTestId('editor-pane-fields').classList.contains('lg:flex')).toBe(true);
            expect(screen.getByTestId('editor-pane-preview').classList.contains('lg:flex')).toBe(true);
        });

        it('defaults to the edit view on small screens', () => {
            renderSplit();
            const fields = screen.getByTestId('editor-pane-fields');
            const preview = screen.getByTestId('editor-pane-preview');
            // Exact token checks: the base classes already include `overflow-hidden`.
            expect(fields.classList.contains('flex')).toBe(true);
            expect(fields.classList.contains('hidden')).toBe(false);
            expect(preview.classList.contains('hidden')).toBe(true);
            expect(preview.classList.contains('flex')).toBe(false);
            expect(screen.getByTestId('editor-view-edit')).toHaveAttribute('aria-pressed', 'true');
            expect(screen.getByTestId('editor-view-preview')).toHaveAttribute('aria-pressed', 'false');
        });

        it('swaps which pane is shown on small screens when toggled', () => {
            renderSplit();
            fireEvent.click(screen.getByTestId('editor-view-preview'));

            const fields = screen.getByTestId('editor-pane-fields');
            const preview = screen.getByTestId('editor-pane-preview');
            expect(preview.classList.contains('flex')).toBe(true);
            expect(preview.classList.contains('hidden')).toBe(false);
            expect(fields.classList.contains('hidden')).toBe(true);
            expect(fields.classList.contains('flex')).toBe(false);
            expect(screen.getByTestId('editor-view-preview')).toHaveAttribute('aria-pressed', 'true');
            expect(screen.getByTestId('editor-view-edit')).toHaveAttribute('aria-pressed', 'false');
        });
    });
});

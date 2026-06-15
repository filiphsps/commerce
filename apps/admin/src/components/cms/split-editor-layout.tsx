'use client';

import { type ReactNode, useState } from 'react';

import { cn } from '@/utils/tailwind';

export type SplitEditorLayoutProps = {
    /** The field column content. */
    children: ReactNode;
    /** Optional live-preview pane. When absent the fields render as one centered column. */
    preview?: ReactNode;
};

/** The two panes a small-screen viewer can switch between. */
type MobileView = 'edit' | 'preview';

const MOBILE_VIEWS: readonly MobileView[] = ['edit', 'preview'] as const;

/**
 * Responsive body for the document editor. On `lg`+ it lays the fields and the
 * live preview side by side, each column owning its OWN scroll so neither steals
 * the other's wheel/touch — the fix for the preview iframe capturing the page
 * scroll. Below `lg` the two panes can't fit, so a segmented Edit/Preview switch
 * shows one full-width pane at a time; the inactive pane stays mounted (just
 * `display:none`) so the preview iframe keeps its live-update bridge alive.
 *
 * Every scroll region is height-bounded (`min-h-0` down the flex/grid chain) and
 * clips the x-axis, so content can never push horizontal overflow onto the page
 * — including the 280px folded-foldable floor.
 *
 * @param props.children - The field column content.
 * @param props.preview - Optional live-preview pane; when omitted, fields render as one centered column.
 * @returns The responsive editor body.
 */
export function SplitEditorLayout({ children, preview }: SplitEditorLayoutProps) {
    const [view, setView] = useState<MobileView>('edit');

    if (!preview) {
        return (
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                <div className="mx-auto flex min-w-0 max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">{children}</div>
            </div>
        );
    }

    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {/* Small-screen view switch; on lg+ both panes show, so it's hidden. */}
            <div
                role="group"
                aria-label="Editor view"
                className="flex shrink-0 gap-1 border-border border-b p-2 lg:hidden"
            >
                {MOBILE_VIEWS.map((value) => (
                    <button
                        key={value}
                        type="button"
                        data-testid={`editor-view-${value}`}
                        aria-pressed={view === value}
                        onClick={() => setView(value)}
                        className={cn(
                            'flex-1 rounded-md px-3 py-1.5 font-medium text-sm capitalize transition-colors',
                            view === value
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                    >
                        {value}
                    </button>
                ))}
            </div>

            <div className="grid min-h-0 min-w-0 flex-1 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                {/* Fields — own scroll. Hidden on mobile while previewing; always shown on lg+. */}
                <div
                    data-testid="editor-pane-fields"
                    className={cn(
                        'min-h-0 min-w-0 flex-col overflow-y-auto overflow-x-hidden',
                        view === 'edit' ? 'flex' : 'hidden',
                        'lg:flex',
                    )}
                >
                    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6 lg:mx-0 lg:max-w-none">
                        {children}
                    </div>
                </div>

                {/* Preview — a bounded box; the iframe inside owns its own scroll. */}
                <div
                    data-testid="editor-pane-preview"
                    className={cn(
                        'min-h-0 min-w-0 overflow-hidden p-3 sm:p-4 lg:border-border lg:border-l',
                        view === 'preview' ? 'flex' : 'hidden',
                        'lg:flex',
                    )}
                >
                    {preview}
                </div>
            </div>
        </div>
    );
}

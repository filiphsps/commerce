import type { ReactNode } from 'react';

import { cn } from '@/utils/tailwind';

/**
 * Props for {@link SettingsSection}.
 */
export interface SettingsSectionProps {
    /** Section heading (rendered as an `<h2>`). */
    title: string;
    /** Optional supporting copy under the heading. */
    description?: string;
    /** The section body. */
    children: ReactNode;
    /** Optional footer region (e.g. a Save button bar). */
    footer?: ReactNode;
    /** Extra classes for the outer card. */
    className?: string;
}

/**
 * A bordered settings card with a titled header, body, and optional footer — the reusable building
 * block for the account page (and any future operator settings surface). Matches the admin's bold,
 * dark, `border-2` card language.
 *
 * @param props - See {@link SettingsSectionProps}.
 * @returns The section element.
 */
export function SettingsSection({ title, description, children, footer, className }: SettingsSectionProps) {
    return (
        <section className={cn('rounded-lg border-2 border-border bg-card', className)}>
            <header className="border-border border-b-2 px-5 py-4">
                <h2 className="font-bold text-sm uppercase tracking-wide">{title}</h2>
                {description ? <p className="mt-1 text-muted-foreground text-sm">{description}</p> : null}
            </header>
            <div className="px-5 py-5">{children}</div>
            {footer ? <footer className="border-border border-t-2 px-5 py-3">{footer}</footer> : null}
        </section>
    );
}

import type { ThemeTokenMeta } from '@nordcom/commerce-db/lib/theme-catalog';
import { RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/tailwind';

/**
 * The value a leaf control reads and writes. The catalog's `valueKind` decides
 * which concrete type a given control narrows this union to; `undefined` models
 * an unset (`derived`) token whose default is supplied at render by the runtime.
 */
export type ControlValue = string | number | boolean | undefined;

/**
 * Props every leaf control receives from {@link TokenControl}. Controls are pure
 * controlled inputs — they own no value state and never read the catalog default
 * themselves; the dispatcher supplies `value`, `placeholder` (the deep-got
 * default), and the write-back `onChange`.
 */
export type ControlProps = {
    /** Catalog metadata for the token this control edits. */
    token: ThemeTokenMeta;
    /** Current value, or `undefined` when unset. */
    value: ControlValue;
    /** Writes the raw value back to form state. */
    onChange: (value: ControlValue) => void;
    /** Default rendered as a placeholder when the value is unset. */
    placeholder?: string;
    /** DOM id, wired to the field-row label. */
    id?: string;
};

/** A leaf control component resolved from the control registry. */
export type Control = (props: ControlProps) => ReactNode;

/**
 * Converts a camelCase token key to a Title Case human label
 * (`ctaPillIcon` → `Cta Pill Icon`).
 *
 * @param key - The trailing path segment / token key.
 * @returns A spaced, capitalized label.
 */
export function humanizeKey(key: string): string {
    const spaced = key.replace(/([A-Z])/g, ' $1').replace(/[_-]+/g, ' ');
    return spaced
        .trim()
        .split(/\s+/)
        .map((word) => (word.length > 0 ? word[0]?.toUpperCase() + word.slice(1) : word))
        .join(' ');
}

/**
 * Props for {@link FieldRow}.
 */
export type FieldRowProps = {
    /** Catalog metadata driving the label, badges, and reset affordance. */
    token: ThemeTokenMeta;
    /** Stable DOM id shared between the label and the control. */
    htmlFor: string;
    /** The control element to render in the value slot. */
    children: ReactNode;
    /** Invoked when the merchant clicks reset; resets to default (or clears `derived`). */
    onReset: () => void;
    /** When `true`, the field failed validation; renders an inline error hint. */
    showError?: boolean;
};

/**
 * Presentational layout for one token: a label derived from the path, status
 * pills (deprecated / forthcoming / derived / quoted-content), the control
 * slot, and a reset-to-default button. Carries no value state — {@link TokenControl}
 * owns the value and the reset semantics and passes them in.
 *
 * @param props.token - Catalog metadata for the rendered token.
 * @param props.htmlFor - DOM id linking the label to the control.
 * @param props.children - The control element.
 * @param props.onReset - Reset handler.
 * @param props.showError - Whether the bound field currently fails validation.
 * @returns The labelled field row.
 */
export function FieldRow({ token, htmlFor, children, onReset, showError }: FieldRowProps) {
    const key = token.path.split('.').pop() ?? token.path;

    return (
        <div className="flex flex-col gap-1.5 py-2">
            <div className="flex items-center justify-between gap-2">
                <label htmlFor={htmlFor} className="font-medium text-foreground text-sm">
                    {humanizeKey(key)}
                </label>
                <div className="flex items-center gap-1.5">
                    {token.deprecated ? <Pill className="bg-muted text-muted-foreground">Deprecated</Pill> : null}
                    {token.forthcoming ? <Pill className="bg-muted text-muted-foreground">No effect yet</Pill> : null}
                    {token.derived ? <Pill className="bg-muted text-muted-foreground">Auto (derived)</Pill> : null}
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Reset to default"
                        className="h-7 w-7"
                        onClick={onReset}
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
            {children}
            {showError ? <p className="text-destructive text-xs">This value is invalid.</p> : null}
            {token.quoted ? (
                <p className="text-muted-foreground text-xs">
                    Stored unquoted — the storefront adds CSS quotes on emit.
                </p>
            ) : null}
        </div>
    );
}

/**
 * Small rounded status badge used for the token pills.
 *
 * @param props.className - Color/variant classes merged onto the badge.
 * @param props.children - The badge label.
 * @returns The pill element.
 */
function Pill({ className, children }: { className?: string; children: ReactNode }) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 font-medium text-[10px] uppercase tracking-wide',
                className,
            )}
        >
            {children}
        </span>
    );
}

'use client';

import { type ComponentPropsWithoutRef, forwardRef, useId } from 'react';

import { cn } from '@/utils/tailwind';

export type TextFieldProps = Omit<ComponentPropsWithoutRef<'input'>, 'onChange'> & {
    /** Field label, rendered above the control and associated for assistive tech. */
    label: string;
    /** Called with the raw string value on every edit. */
    onChange?: (value: string) => void;
};

/**
 * Controlled single-line text field: a native `<input>` paired with an associated label, styled to the
 * admin's bold dark theme. Unlike `@nordcom/nordstar`'s `Input` — which is uncontrolled by design and
 * overrides any consumer `onChange` (read it via FormData) — this lifts every keystroke through
 * `onChange(value)`, so it is safe for controlled state with live validation.
 *
 * @param props.label - The field label (also its accessible name).
 * @param props.onChange - Raw-string change handler.
 * @param props.id - Optional explicit id for label association; auto-generated otherwise.
 * @param props.className - Extra classes merged onto the input.
 * @returns The labeled text field.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
    ({ label, onChange, id, className, ...props }, ref) => {
        const generatedId = useId();
        const fieldId = id ?? generatedId;
        return (
            <div className="flex flex-col gap-1.5">
                <label
                    htmlFor={fieldId}
                    className="font-semibold text-muted-foreground text-xs uppercase tracking-wide"
                >
                    {label}
                </label>
                <input
                    ref={ref}
                    id={fieldId}
                    {...props}
                    onChange={(event) => onChange?.(event.target.value)}
                    className={cn(
                        'flex h-11 w-full rounded-md border-2 border-border bg-background px-3 py-1 font-medium text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                        className,
                    )}
                />
            </div>
        );
    },
);
TextField.displayName = 'TextField';

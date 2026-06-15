'use client';

import { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { cn } from '@/utils/tailwind';

/**
 * Bare single-line `<input>` styled to the admin's dark theme — the shared
 * primitive behind the theme-editor controls and the color field's text slot.
 * It carries no label; pair it with an external `<label>` (e.g. inside a field
 * row). For a label-bundled control use `TextField`.
 *
 * @param props.className - Extra classes merged onto the input (e.g. `font-mono`).
 * @returns The styled input element.
 */
export const Input = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<'input'>>(({ className, ...props }, ref) => (
    <input
        ref={ref}
        className={cn(
            'flex h-9 w-full rounded-md border-2 border-border bg-background px-3 py-1 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
            className,
        )}
        {...props}
    />
));
Input.displayName = 'Input';

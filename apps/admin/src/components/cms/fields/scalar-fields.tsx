'use client';

import type {
    CheckboxFieldDescriptor,
    DateFieldDescriptor,
    EmailFieldDescriptor,
    NumberFieldDescriptor,
    TextareaFieldDescriptor,
    TextFieldDescriptor,
} from '@nordcom/commerce-cms/descriptors';
import { type FieldRendererProps, FieldShell, useEditorField } from '@nordcom/commerce-cms/editor/form';
import { Switch } from '@nordcom/nordstar';
import type { ChangeEvent } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/utils/tailwind';

/**
 * Shared textarea control class — mirrors the admin `Input` primitive's bold
 * dark-theme chrome (2px border, focus ring) so multiline fields sit
 * consistently beside the single-line ones.
 */
const textareaClassName =
    'flex min-h-28 w-full rounded-md border-2 border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Single-line text widget rendered through the admin's controlled `Input`
 * primitive. Replaces the library's bare `<input>` so content fields match the
 * rest of the admin shell.
 *
 * @param props.field - The text descriptor.
 * @param props.path - The field's dotted form-state path.
 * @returns The bound text input, or `null` when its condition hides it.
 */
export function AdminTextField({ field, path }: FieldRendererProps<TextFieldDescriptor>) {
    const { value, setValue, visible, error } = useEditorField<string>(field, path);
    if (!visible) return null;
    return (
        <FieldShell htmlFor={path} label={field.label ?? field.name} required={field.required} errorMessage={error}>
            <Input
                id={path}
                type="text"
                required={field.required}
                value={value ?? ''}
                onChange={(event) => setValue(event.target.value)}
            />
        </FieldShell>
    );
}

/**
 * Multi-line text widget. Reads and writes a string at its dotted path.
 *
 * @param props.field - The textarea descriptor.
 * @param props.path - The field's dotted form-state path.
 * @returns The bound textarea, or `null` when its condition hides it.
 */
export function AdminTextareaField({ field, path }: FieldRendererProps<TextareaFieldDescriptor>) {
    const { value, setValue, visible, error } = useEditorField<string>(field, path);
    if (!visible) return null;
    return (
        <FieldShell htmlFor={path} label={field.label ?? field.name} required={field.required} errorMessage={error}>
            <textarea
                id={path}
                required={field.required}
                value={value ?? ''}
                onChange={(event) => setValue(event.target.value)}
                className={textareaClassName}
            />
        </FieldShell>
    );
}

/**
 * Numeric widget. Writes a number, or `undefined` when the input is cleared so
 * an empty field never serializes a `NaN`.
 *
 * @param props.field - The number descriptor.
 * @param props.path - The field's dotted form-state path.
 * @returns The bound number input, or `null` when its condition hides it.
 */
export function AdminNumberField({ field, path }: FieldRendererProps<NumberFieldDescriptor>) {
    const { value, setValue, visible, error } = useEditorField<number | undefined>(field, path);
    if (!visible) return null;
    const onChange = (event: ChangeEvent<HTMLInputElement>) => {
        const raw = event.target.value;
        setValue(raw === '' ? undefined : Number(raw));
    };
    return (
        <FieldShell htmlFor={path} label={field.label ?? field.name} required={field.required} errorMessage={error}>
            <Input id={path} type="number" required={field.required} value={value ?? ''} onChange={onChange} />
        </FieldShell>
    );
}

/**
 * Email widget — a controlled input that validates address format natively.
 *
 * @param props.field - The email descriptor.
 * @param props.path - The field's dotted form-state path.
 * @returns The bound email input, or `null` when its condition hides it.
 */
export function AdminEmailField({ field, path }: FieldRendererProps<EmailFieldDescriptor>) {
    const { value, setValue, visible, error } = useEditorField<string>(field, path);
    if (!visible) return null;
    return (
        <FieldShell htmlFor={path} label={field.label ?? field.name} required={field.required} errorMessage={error}>
            <Input
                id={path}
                type="email"
                required={field.required}
                value={value ?? ''}
                onChange={(event) => setValue(event.target.value)}
            />
        </FieldShell>
    );
}

/**
 * Date widget. Binds the date portion of an ISO-8601 string to a native date
 * input rendered through the admin `Input` chrome.
 *
 * @param props.field - The date descriptor.
 * @param props.path - The field's dotted form-state path.
 * @returns The bound date input, or `null` when its condition hides it.
 */
export function AdminDateField({ field, path }: FieldRendererProps<DateFieldDescriptor>) {
    const { value, setValue, visible, error } = useEditorField<string>(field, path);
    if (!visible) return null;
    return (
        <FieldShell htmlFor={path} label={field.label ?? field.name} required={field.required} errorMessage={error}>
            <Input
                id={path}
                type="date"
                required={field.required}
                value={(value ?? '').slice(0, 10)}
                onChange={(event) => setValue(event.target.value)}
                className="[color-scheme:dark]"
            />
        </FieldShell>
    );
}

/**
 * Boolean widget backed by nordstar's `Switch` — a clearer affordance than a raw
 * checkbox for the admin's toggle-heavy settings surfaces.
 *
 * @param props.field - The checkbox descriptor.
 * @param props.path - The field's dotted form-state path.
 * @returns The bound switch, or `null` when its condition hides it.
 */
export function AdminCheckboxField({ field, path }: FieldRendererProps<CheckboxFieldDescriptor>) {
    const { value, setValue, visible, error } = useEditorField<boolean>(field, path);
    if (!visible) return null;
    return (
        <FieldShell htmlFor={path} label={field.label ?? field.name} required={field.required} errorMessage={error}>
            <div className={cn('flex h-9 items-center')}>
                <Switch id={path} checked={value ?? false} onCheckedChange={(next) => setValue(next)} />
            </div>
        </FieldShell>
    );
}

'use client';

import { type ChangeEvent, useState } from 'react';

import type {
    CheckboxFieldDescriptor,
    CodeFieldDescriptor,
    DateFieldDescriptor,
    EmailFieldDescriptor,
    JsonFieldDescriptor,
    NumberFieldDescriptor,
    SelectFieldDescriptor,
    TextareaFieldDescriptor,
    TextFieldDescriptor,
} from '../../../descriptors/types';
import { cn } from '../../../utils/tailwind';
import type { FieldRendererProps } from '../registry';
import { FieldShell, fieldControlClassName, useEditorField } from './field-shell';

/**
 * Single-line text widget. Reads and writes a string at its dotted path.
 *
 * @param props.field - The text descriptor.
 * @param props.path - The field's dotted form-state path.
 * @returns The bound text input, or `null` when its condition hides it.
 */
export function TextField({ field, path }: FieldRendererProps<TextFieldDescriptor>) {
    const { value, setValue, visible, error } = useEditorField<string>(field, path);
    if (!visible) return null;

    return (
        <FieldShell htmlFor={path} label={field.label ?? field.name} required={field.required} errorMessage={error}>
            <input
                id={path}
                type="text"
                required={field.required}
                value={value ?? ''}
                onChange={(event) => setValue(event.target.value)}
                className={fieldControlClassName}
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
export function TextareaField({ field, path }: FieldRendererProps<TextareaFieldDescriptor>) {
    const { value, setValue, visible, error } = useEditorField<string>(field, path);
    if (!visible) return null;

    return (
        <FieldShell htmlFor={path} label={field.label ?? field.name} required={field.required} errorMessage={error}>
            <textarea
                id={path}
                required={field.required}
                value={value ?? ''}
                onChange={(event) => setValue(event.target.value)}
                className={cn(fieldControlClassName, 'min-h-24')}
            />
        </FieldShell>
    );
}

/**
 * Enumerated single-choice widget. An always-present empty option keeps the
 * controlled value valid even when nothing is selected; `required` enforces a
 * choice through native form validation.
 *
 * @param props.field - The select descriptor.
 * @param props.path - The field's dotted form-state path.
 * @returns The bound select, or `null` when its condition hides it.
 */
export function SelectField({ field, path }: FieldRendererProps<SelectFieldDescriptor>) {
    const { value, setValue, visible, error } = useEditorField<string>(field, path);
    if (!visible) return null;

    return (
        <FieldShell htmlFor={path} label={field.label ?? field.name} required={field.required} errorMessage={error}>
            <select
                id={path}
                required={field.required}
                value={value ?? ''}
                onChange={(event) => setValue(event.target.value)}
                className={fieldControlClassName}
            >
                <option value="">Select…</option>
                {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </FieldShell>
    );
}

/**
 * Boolean toggle widget. Reads and writes a boolean at its dotted path.
 *
 * @param props.field - The checkbox descriptor.
 * @param props.path - The field's dotted form-state path.
 * @returns The bound checkbox, or `null` when its condition hides it.
 */
export function CheckboxField({ field, path }: FieldRendererProps<CheckboxFieldDescriptor>) {
    const { value, setValue, visible, error } = useEditorField<boolean>(field, path);
    if (!visible) return null;

    return (
        <FieldShell htmlFor={path} label={field.label ?? field.name} required={field.required} errorMessage={error}>
            <input
                id={path}
                type="checkbox"
                required={field.required}
                checked={value ?? false}
                onChange={(event) => setValue(event.target.checked)}
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
export function NumberField({ field, path }: FieldRendererProps<NumberFieldDescriptor>) {
    const { value, setValue, visible, error } = useEditorField<number | undefined>(field, path);
    if (!visible) return null;

    const onChange = (event: ChangeEvent<HTMLInputElement>) => {
        const raw = event.target.value;
        setValue(raw === '' ? undefined : Number(raw));
    };

    return (
        <FieldShell htmlFor={path} label={field.label ?? field.name} required={field.required} errorMessage={error}>
            <input
                id={path}
                type="number"
                required={field.required}
                value={value ?? ''}
                onChange={onChange}
                className={fieldControlClassName}
            />
        </FieldShell>
    );
}

/**
 * Date widget. Binds the date portion of an ISO-8601 string to a native date
 * input.
 *
 * @param props.field - The date descriptor.
 * @param props.path - The field's dotted form-state path.
 * @returns The bound date input, or `null` when its condition hides it.
 */
export function DateField({ field, path }: FieldRendererProps<DateFieldDescriptor>) {
    const { value, setValue, visible, error } = useEditorField<string>(field, path);
    if (!visible) return null;

    return (
        <FieldShell htmlFor={path} label={field.label ?? field.name} required={field.required} errorMessage={error}>
            <input
                id={path}
                type="date"
                required={field.required}
                value={(value ?? '').slice(0, 10)}
                onChange={(event) => setValue(event.target.value)}
                className={fieldControlClassName}
            />
        </FieldShell>
    );
}

/**
 * Email widget — a text input that validates address format natively.
 *
 * @param props.field - The email descriptor.
 * @param props.path - The field's dotted form-state path.
 * @returns The bound email input, or `null` when its condition hides it.
 */
export function EmailField({ field, path }: FieldRendererProps<EmailFieldDescriptor>) {
    const { value, setValue, visible, error } = useEditorField<string>(field, path);
    if (!visible) return null;

    return (
        <FieldShell htmlFor={path} label={field.label ?? field.name} required={field.required} errorMessage={error}>
            <input
                id={path}
                type="email"
                required={field.required}
                value={value ?? ''}
                onChange={(event) => setValue(event.target.value)}
                className={fieldControlClassName}
            />
        </FieldShell>
    );
}

/**
 * Serialize a JSON value for display in the textarea buffer. `undefined`
 * renders as an empty string so a never-set field starts blank.
 *
 * @param value - The current JSON value held in form state.
 * @returns A pretty-printed JSON string, or `''`.
 */
function stringifyJson(value: unknown): string {
    if (value === undefined) return '';
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return '';
    }
}

/**
 * Free-form JSON widget. Edits through a local text buffer and commits the
 * parsed value to form state on every valid edit; an unparseable buffer is held
 * locally and surfaced as an inline error without corrupting the stored value.
 *
 * @param props.field - The JSON descriptor.
 * @param props.path - The field's dotted form-state path.
 * @returns The bound JSON editor, or `null` when its condition hides it.
 */
export function JsonField({ field, path }: FieldRendererProps<JsonFieldDescriptor>) {
    const { value, setValue, visible, error } = useEditorField<unknown>(field, path);
    const [text, setText] = useState(() => stringifyJson(value));
    const [parseError, setParseError] = useState<string | undefined>(undefined);
    if (!visible) return null;

    const onChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        const raw = event.target.value;
        setText(raw);
        if (raw.trim() === '') {
            setParseError(undefined);
            setValue(undefined);
            return;
        }
        try {
            const parsed: unknown = JSON.parse(raw);
            setParseError(undefined);
            setValue(parsed);
        } catch (cause) {
            setParseError(cause instanceof Error ? cause.message : 'Invalid JSON.');
        }
    };

    return (
        <FieldShell
            htmlFor={path}
            label={field.label ?? field.name}
            required={field.required}
            errorMessage={parseError ?? error}
        >
            <textarea
                id={path}
                value={text}
                onChange={onChange}
                className={cn(fieldControlClassName, 'min-h-24 font-mono')}
            />
        </FieldShell>
    );
}

/**
 * Source-code widget. Reads and writes a string at its dotted path; the
 * descriptor's `language` is exposed as `data-language` for future syntax
 * highlighting.
 *
 * @param props.field - The code descriptor.
 * @param props.path - The field's dotted form-state path.
 * @returns The bound code editor, or `null` when its condition hides it.
 */
export function CodeField({ field, path }: FieldRendererProps<CodeFieldDescriptor>) {
    const { value, setValue, visible, error } = useEditorField<string>(field, path);
    if (!visible) return null;

    return (
        <FieldShell htmlFor={path} label={field.label ?? field.name} required={field.required} errorMessage={error}>
            <textarea
                id={path}
                required={field.required}
                data-language={field.language}
                value={value ?? ''}
                onChange={(event) => setValue(event.target.value)}
                className={cn(fieldControlClassName, 'min-h-24 font-mono')}
            />
        </FieldShell>
    );
}

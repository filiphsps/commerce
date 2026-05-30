'use client';

import type { ThemeTokenMeta } from '@nordcom/commerce-db';
import { useField, useForm, useFormFields } from '@payloadcms/ui';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { resolveControl } from './control-registry';
import type { ControlValue } from './controls/field-row';

/**
 * The `[]` marker in a token path separates the array base from the per-element
 * key. `theme.colors.accents[].type` → base `theme.colors.accents`, key `type`.
 */
const ARRAY_MARKER = '[]';

/**
 * Splits an `accents[]` element token path into its array base and trailing
 * element key (e.g. `theme.colors.accents[].type` → `['theme.colors.accents', 'type']`).
 *
 * @param path - The element token's catalog path containing the `[]` marker.
 * @returns A tuple of the array base path and the element key.
 */
function splitArrayPath(path: string): [base: string, key: string] {
    const markerIndex = path.indexOf(ARRAY_MARKER);
    const base = path.slice(0, markerIndex);
    const key = path.slice(markerIndex + ARRAY_MARKER.length + 1);
    return [base, key];
}

/**
 * Props for {@link AccentRepeater}.
 */
export type AccentRepeaterProps = {
    /**
     * The catalog rows for the `accents[]` array element (the `type`, `color`,
     * and `foreground` leaves). Drives which control renders for each cell so
     * no field name is hardcoded in this component.
     */
    tokens: ThemeTokenMeta[];
};

/**
 * Bespoke repeater for `theme.colors.accents[]` — an indexed array of
 * `{ type, color, foreground }` rather than a flat leaf. Reads the live row
 * count from Payload form state, renders one {@link AccentCell} per element
 * token at its indexed path, and adds/removes rows via `useForm().dispatchFields`
 * (`ADD_ROW`/`REMOVE_ROW`) plus `setModified(true)`. The editor writes
 * `theme.colors.accents`, which `resolveTheme` prefers over `design.accents`
 * when non-empty.
 *
 * @param props.tokens - The `accents[]` element catalog rows.
 * @returns The accent repeater surface.
 * @throws When invoked outside Payload's `<Form>` (no form context).
 */
export function AccentRepeater({ tokens }: AccentRepeaterProps) {
    const first = tokens[0];
    const [basePath] = first ? splitArrayPath(first.path) : ['theme.colors.accents'];
    const { dispatchFields, setModified } = useForm();
    const rows = useFormFields(([fields]) => fields[basePath]?.rows ?? []);

    const addRow = () => {
        dispatchFields({ type: 'ADD_ROW', path: basePath, subFieldState: seedRowState(tokens) });
        setModified(true);
    };

    const removeRow = (rowIndex: number) => {
        dispatchFields({ type: 'REMOVE_ROW', path: basePath, rowIndex });
        setModified(true);
    };

    return (
        <div className="flex flex-col gap-3">
            {rows.map((row, index) => (
                <div key={row.id} className="flex flex-col gap-2 rounded-md border-2 border-border p-3">
                    <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground text-sm">Accent {index + 1}</span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Remove accent"
                            className="h-7 w-7"
                            onClick={() => removeRow(index)}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    {tokens.map((token) => (
                        <AccentCell key={token.path} token={token} basePath={basePath} rowIndex={index} />
                    ))}
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="self-start" onClick={addRow}>
                <Plus className="h-3.5 w-3.5" />
                Add accent
            </Button>
        </div>
    );
}

/**
 * Builds the `subFieldState` seed for a freshly added accent row so each element
 * leaf exists in form state immediately (rather than appearing only once edited).
 * Keys are the element tokens' trailing path segments; values start empty.
 *
 * @param tokens - The `accents[]` element catalog rows.
 * @returns A form-state fragment keyed by element key.
 */
function seedRowState(tokens: ThemeTokenMeta[]): Record<string, { value: string; initialValue: string }> {
    const seed: Record<string, { value: string; initialValue: string }> = {};
    for (const token of tokens) {
        const [, key] = splitArrayPath(token.path);
        seed[key] = { value: '', initialValue: '' };
    }
    return seed;
}

/**
 * Props for {@link AccentCell}.
 */
type AccentCellProps = {
    /** Catalog metadata for the element leaf this cell edits. */
    token: ThemeTokenMeta;
    /** The accents array base path (`theme.colors.accents`). */
    basePath: string;
    /** Zero-based index of the row this cell belongs to. */
    rowIndex: number;
};

/**
 * One editable accent cell, bound to its indexed form-state path
 * (`theme.colors.accents.<rowIndex>.<key>`) via `useField`. Resolves and renders
 * the same leaf control the registry would pick for the element token, writing
 * the raw value straight to form state.
 *
 * @param props.token - Catalog metadata for the element leaf.
 * @param props.basePath - The accents array base path.
 * @param props.rowIndex - Zero-based row index.
 * @returns The labelled accent cell control.
 */
function AccentCell({ token, basePath, rowIndex }: AccentCellProps) {
    const [, key] = splitArrayPath(token.path);
    const path = `${basePath}.${rowIndex}.${key}`;
    const { value, setValue } = useField<ControlValue>({ path });
    const Control = resolveControl(token);

    return (
        <label className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs capitalize">{key}</span>
            <Control token={token} value={value} onChange={setValue} id={path} />
        </label>
    );
}

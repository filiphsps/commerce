'use client';

import { type FormAction, type FormState, useAllFormFields, useField } from '@nordcom/commerce-cms/editor/form';
import type { ThemeTokenMeta } from '@nordcom/commerce-db/lib/theme-catalog';
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
 * Collect the row indices currently present under the accents base path by
 * inspecting which `${base}.<index>.<key>` leaf paths exist in form state —
 * the same row derivation the native `ArrayField` uses, since the native core
 * keeps no separate `rows` metadata. The dot guard stops `accents.1` from
 * being read out of a sibling leaf like `accentPrimaryLight`.
 *
 * @param state - The live form state.
 * @param basePath - The accents array base path.
 * @returns The present row indices, ascending.
 */
function deriveRowIndices(state: FormState, basePath: string): number[] {
    const prefix = `${basePath}.`;
    const seen = new Set<number>();
    for (const key of Object.keys(state)) {
        if (!key.startsWith(prefix)) continue;
        const head = key.slice(prefix.length).split('.')[0];
        if (head !== undefined && /^\d+$/.test(head)) seen.add(Number(head));
    }
    return [...seen].sort((a, b) => a - b);
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
 * `{ type, color, foreground }` rather than a flat leaf — built on the NATIVE
 * form core. Rows are derived from the indexed leaf paths in form state;
 * adding a row seeds its element leaves (value `''`, no `initialValue`, so the
 * form reads as dirty immediately), and removing one re-homes the survivors to
 * compact indices. Removing the last row writes an explicit `[]` at the base
 * path so the save serializes the cleared array instead of silently keeping
 * the published rows. The editor writes `theme.colors.accents`, which
 * `resolveTheme` prefers over `design.accents` when non-empty.
 *
 * @param props.tokens - The `accents[]` element catalog rows.
 * @returns The accent repeater surface.
 * @throws {MissingContextProviderError} When mounted outside the native `<Form>`.
 */
export function AccentRepeater({ tokens }: AccentRepeaterProps) {
    const first = tokens[0];
    const [basePath] = first ? splitArrayPath(first.path) : ['theme.colors.accents'];
    const [state, dispatch] = useAllFormFields();
    const indices = deriveRowIndices(state, basePath);

    const addRow = () => {
        const nextIndex = indices.length;
        for (const token of tokens) {
            const [, key] = splitArrayPath(token.path);
            dispatch({ type: 'UPDATE', path: `${basePath}.${nextIndex}.${key}`, value: '' });
        }
    };

    const removeRow = (rowIndex: number) => {
        // One-shot snapshot reindex (the ArrayField pattern): drop every indexed
        // leaf, then re-emit each survivor at its compacted index. The re-emitted
        // leaves lose their `initialValue`, which is what keeps the form dirty
        // after a removal.
        const prefix = `${basePath}.`;
        const survivors = indices.filter((index) => index !== rowIndex);
        const actions: FormAction[] = [];
        for (const key of Object.keys(state)) {
            if (key.startsWith(prefix)) actions.push({ type: 'REMOVE', path: key });
        }
        survivors.forEach((oldIndex, newIndex) => {
            for (const token of tokens) {
                const [, key] = splitArrayPath(token.path);
                actions.push({
                    type: 'UPDATE',
                    path: `${basePath}.${newIndex}.${key}`,
                    value: state[`${basePath}.${oldIndex}.${key}`]?.value ?? '',
                });
            }
        });
        if (survivors.length === 0) {
            actions.push({ type: 'UPDATE', path: basePath, value: [] });
        }
        for (const action of actions) dispatch(action);
    };

    return (
        <div className="flex flex-col gap-3">
            {indices.map((rowIndex, position) => (
                <div key={rowIndex} className="flex flex-col gap-2 rounded-md border-2 border-border p-3">
                    <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground text-sm">Accent {position + 1}</span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Remove accent"
                            className="h-7 w-7"
                            onClick={() => removeRow(rowIndex)}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    {tokens.map((token) => (
                        <AccentCell key={token.path} token={token} basePath={basePath} rowIndex={rowIndex} />
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
 * (`theme.colors.accents.<rowIndex>.<key>`) via the native `useField`. Resolves
 * and renders the same leaf control the registry would pick for the element
 * token, writing the raw value straight to form state.
 *
 * @param props.token - Catalog metadata for the element leaf.
 * @param props.basePath - The accents array base path.
 * @param props.rowIndex - Zero-based row index.
 * @returns The labelled accent cell control.
 * @throws {MissingContextProviderError} When mounted outside the native `<Form>`.
 */
function AccentCell({ token, basePath, rowIndex }: AccentCellProps) {
    const [, key] = splitArrayPath(token.path);
    const path = `${basePath}.${rowIndex}.${key}`;
    const { value, setValue } = useField<ControlValue>({ path });
    const Control = resolveControl(token);

    return (
        <label htmlFor={path} className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs capitalize">{key}</span>
            <Control token={token} value={value} onChange={setValue} id={path} />
        </label>
    );
}

'use client';

import { type Dispatch, useRef, useState } from 'react';

import type { ArrayFieldDescriptor } from '../../../descriptors/types';
import { useAllFormFields } from '../hooks';
import type { FieldRendererProps } from '../registry';
import { RenderFields } from '../registry';
import type { FormAction, FormState } from '../types';
import {
    addButtonClassName,
    iconButtonClassName,
    removeButtonClassName,
    rowCardClassName,
    rowHeaderClassName,
    rowTitleClassName,
} from './control-styles';

/**
 * A row's stable identity. The `id` is the React key, decoupled from the row's
 * positional index so a reorder reattaches the same component (and its in-flight
 * input state) to its new index instead of remounting — which is what keeps the
 * keystroke-clobber guard from churning when dotted paths shift on reorder.
 */
type ArrayRow = { id: string };

/**
 * Collect the contiguous row indices currently present under an array path by
 * inspecting which `${path}.<index>.…` leaf paths exist in form state. The dot
 * guard stops `items.1` from being read out of a sibling like `items.10`.
 *
 * @param state - The live form state.
 * @param path - The array field's dotted path.
 * @returns The present row indices, ascending.
 */
function deriveRowIndices(state: FormState, path: string): number[] {
    const prefix = `${path}.`;
    const seen = new Set<number>();
    for (const key of Object.keys(state)) {
        if (!key.startsWith(prefix)) continue;
        const head = key.slice(prefix.length).split('.')[0];
        if (head !== undefined && /^\d+$/.test(head)) seen.add(Number(head));
    }
    return [...seen].sort((a, b) => a - b);
}

/**
 * Reducer actions that re-home an array's leaf paths to a new row ordering.
 * Every existing subtree path is removed, then each surviving row's leaves are
 * re-emitted at its new positional index — carrying the value/validity across
 * so a reorder or removal moves whole rows (including localized bucket objects
 * stored at a single leaf) intact. Computed from a one-shot snapshot so the
 * dispatch order can never read a path it has already rewritten.
 *
 * @param state - The live form state to snapshot.
 * @param path - The array field's dotted path.
 * @param order - Old row indices in their new positional order; omit an index to drop that row.
 * @returns The ordered actions to dispatch.
 */
function reindexActions(state: FormState, path: string, order: number[]): FormAction[] {
    const prefix = `${path}.`;
    const byIndex = new Map<
        number,
        Array<{ suffix: string; value: unknown; valid?: boolean; errorMessage?: string }>
    >();

    for (const key of Object.keys(state)) {
        if (!key.startsWith(prefix)) continue;
        const rest = key.slice(prefix.length);
        const head = rest.split('.')[0];
        if (head === undefined || !/^\d+$/.test(head)) continue;
        const entry = state[key];
        if (!entry) continue;
        const index = Number(head);
        const list = byIndex.get(index) ?? [];
        list.push({
            suffix: rest.slice(head.length),
            value: entry.value,
            valid: entry.valid,
            errorMessage: entry.errorMessage,
        });
        byIndex.set(index, list);
    }

    const actions: FormAction[] = [];
    for (const key of Object.keys(state)) {
        if (key.startsWith(prefix)) actions.push({ type: 'REMOVE', path: key });
    }
    order.forEach((oldIndex, newIndex) => {
        const leaves = byIndex.get(oldIndex);
        if (!leaves) return;
        for (const leaf of leaves) {
            actions.push({
                type: 'UPDATE',
                path: `${path}.${newIndex}${leaf.suffix}`,
                value: leaf.value,
                valid: leaf.valid,
                errorMessage: leaf.errorMessage,
            });
        }
    });
    return actions;
}

/**
 * Apply a new row ordering to both the form state (re-homing leaf paths) and
 * the local id list (so ids travel with their content). A shared helper for the
 * remove and reorder controls.
 *
 * @param args.state - The live form state.
 * @param args.dispatch - The form reducer dispatch.
 * @param args.path - The array field's dotted path.
 * @param args.rows - The current rows.
 * @param args.order - Old positional indices in their new order.
 * @param args.setRows - Setter for the local row list.
 */
function applyOrder(args: {
    state: FormState;
    dispatch: Dispatch<FormAction>;
    path: string;
    rows: ArrayRow[];
    order: number[];
    setRows: (rows: ArrayRow[]) => void;
}): void {
    const { state, dispatch, path, rows, order, setRows } = args;
    for (const action of reindexActions(state, path, order)) dispatch(action);
    setRows(order.map((oldIndex) => rows[oldIndex]).filter((row): row is ArrayRow => row !== undefined));
}

/**
 * Repeatable array container widget. Renders one editable block per row and the
 * add/remove/reorder controls, recursing through {@link RenderFields} with
 * `${path}.${index}` as each row's `parentPath` so the same dispatch registry
 * drives the nested fields at any depth — the recursion that lets a nav menu
 * nest items inside items.
 *
 * Row identity lives in local state, keyed by a stable id rather than the
 * positional index, so reordering moves a row's React subtree (preserving
 * focused inputs) while {@link reindexActions} re-homes the underlying leaf
 * paths to match the new order. The array holds no value of its own; its rows'
 * values live at the indexed leaf paths and reconstruct into an array via
 * `reduceFieldsToValues`.
 *
 * @param props.field - The array descriptor, read for its row `fields` and `minRows`/`maxRows`.
 * @param props.path - The array's dotted form-state path (e.g. `items` or `items.0.items`).
 * @param props.registry - The registry used to dispatch each row's nested fields.
 * @returns The rendered rows with their controls and an add button.
 * @throws {MissingContextProviderError} When used outside a `<Form>`.
 */
export function ArrayField({ field, path, registry }: FieldRendererProps<ArrayFieldDescriptor>) {
    const [state, dispatch] = useAllFormFields();
    const idCounter = useRef(0);
    const [rows, setRows] = useState<ArrayRow[]>(() => {
        const count = Math.max(deriveRowIndices(state, path).length, field.minRows ?? 0);
        return Array.from({ length: count }, () => ({ id: `row-${idCounter.current++}` }));
    });

    const atMin = rows.length <= (field.minRows ?? 0);
    const atMax = field.maxRows !== undefined && rows.length >= field.maxRows;

    /**
     * Append an empty row; its leaf paths are created lazily on first edit.
     */
    const addRow = () => {
        if (atMax) return;
        setRows([...rows, { id: `row-${idCounter.current++}` }]);
    };

    /**
     * Drop the row at `index`, shifting the trailing rows' leaf paths down.
     *
     * @param index - Positional index of the row to remove.
     */
    const removeRow = (index: number) => {
        if (atMin) return;
        const order = rows.map((_, i) => i).filter((i) => i !== index);
        applyOrder({ state, dispatch, path, rows, order, setRows });
    };

    /**
     * Swap the row at `index` with its neighbor in `direction`, re-homing both
     * rows' leaf paths.
     *
     * @param index - Positional index of the row to move.
     * @param direction - `-1` to move up, `1` to move down.
     */
    const moveRow = (index: number, direction: -1 | 1) => {
        const target = index + direction;
        if (target < 0 || target >= rows.length) return;
        const order = rows.map((_, i) => i);
        const moved = order[index];
        const swapped = order[target];
        if (moved === undefined || swapped === undefined) return;
        order[index] = swapped;
        order[target] = moved;
        applyOrder({ state, dispatch, path, rows, order, setRows });
    };

    return (
        <div data-testid={`array-${path}`} className="flex flex-col gap-3">
            {rows.map((row, index) => (
                <div
                    key={row.id}
                    data-testid={`array-row-${path}`}
                    data-row-id={row.id}
                    data-row-index={index}
                    className={rowCardClassName}
                >
                    <div className={rowHeaderClassName}>
                        <span className={rowTitleClassName}>{`${field.label ?? field.name} ${index + 1}`}</span>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                data-testid={`array-move-up-${path}-${index}`}
                                aria-label="Move row up"
                                disabled={index === 0}
                                onClick={() => moveRow(index, -1)}
                                className={iconButtonClassName}
                            >
                                ↑
                            </button>
                            <button
                                type="button"
                                data-testid={`array-move-down-${path}-${index}`}
                                aria-label="Move row down"
                                disabled={index === rows.length - 1}
                                onClick={() => moveRow(index, 1)}
                                className={iconButtonClassName}
                            >
                                ↓
                            </button>
                            <button
                                type="button"
                                data-testid={`array-remove-${path}-${index}`}
                                aria-label="Remove row"
                                disabled={atMin}
                                onClick={() => removeRow(index)}
                                className={removeButtonClassName}
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                    <RenderFields registry={registry} fields={field.fields} parentPath={`${path}.${index}`} />
                </div>
            ))}
            <button
                type="button"
                data-testid={`array-add-${path}`}
                disabled={atMax}
                onClick={addRow}
                className={addButtonClassName}
            >
                <span aria-hidden="true" className="text-base leading-none">
                    +
                </span>
                Add row
            </button>
        </div>
    );
}

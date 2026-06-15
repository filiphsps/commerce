'use client';

import { type Dispatch, useRef, useState } from 'react';

import type { BlockDescriptor, BlocksFieldDescriptor } from '../../../descriptors/types';
import { useAllFormFields } from '../hooks';
import type { FieldRendererProps } from '../registry';
import { RenderFields } from '../registry';
import type { FormAction, FormState } from '../types';
import {
    addButtonClassName,
    iconButtonClassName,
    pickerSelectClassName,
    removeButtonClassName,
    rowCardClassName,
    rowHeaderClassName,
    rowTitleClassName,
} from './control-styles';

/**
 * A block row's stable identity. The `id` is the React key, decoupled from the
 * row's positional index so a reorder reattaches the same subtree (and its
 * in-flight inputs) to its new index instead of remounting — the same row
 * identity contract the array widget relies on.
 */
type BlockRow = { id: string };

/**
 * Collect the contiguous row indices currently present under a blocks path by
 * inspecting which `${path}.<index>.…` leaf paths exist in form state. The dot
 * guard stops `content.1` from being read out of a sibling like `content.10`.
 *
 * @param state - The live form state.
 * @param path - The blocks field's dotted path.
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
 * Reducer actions that re-home a blocks field's leaf paths to a new row
 * ordering. Every existing subtree path is removed, then each surviving row's
 * leaves are re-emitted at its new positional index — carrying the
 * value/validity across so a reorder or removal moves whole block instances
 * (including the `blockType` discriminant leaf) intact. Computed from a one-shot
 * snapshot so the dispatch order can never read a path it has already rewritten.
 *
 * @param state - The live form state to snapshot.
 * @param path - The blocks field's dotted path.
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
 * the local id list (so ids travel with their content). Shared by the remove
 * and reorder controls.
 *
 * @param args.state - The live form state.
 * @param args.dispatch - The form reducer dispatch.
 * @param args.path - The blocks field's dotted path.
 * @param args.rows - The current rows.
 * @param args.order - Old positional indices in their new order.
 * @param args.setRows - Setter for the local row list.
 */
function applyOrder(args: {
    state: FormState;
    dispatch: Dispatch<FormAction>;
    path: string;
    rows: BlockRow[];
    order: number[];
    setRows: (rows: BlockRow[]) => void;
}): void {
    const { state, dispatch, path, rows, order, setRows } = args;
    for (const action of reindexActions(state, path, order)) dispatch(action);
    setRows(order.map((oldIndex) => rows[oldIndex]).filter((row): row is BlockRow => row !== undefined));
}

/**
 * Read a row's chosen block type from its `blockType` discriminant leaf.
 *
 * @param state - The live form state.
 * @param path - The blocks field's dotted path.
 * @param index - The row's positional index.
 * @returns The stored block-type slug, or `undefined` when the row has none yet.
 */
function rowBlockType(state: FormState, path: string, index: number): string | undefined {
    const value = state[`${path}.${index}.blockType`]?.value;
    return typeof value === 'string' ? value : undefined;
}

/**
 * Polymorphic blocks container widget — the editor counterpart of a Payload
 * `blocks` field. Renders a block-type picker plus add/remove/reorder controls,
 * and for each row resolves its `blockType` against the field's
 * {@link BlocksFieldDescriptor.blocks} set and recurses that block's descriptor
 * fields through {@link RenderFields} with `${path}.${index}` as the row's
 * `parentPath`. The recursion is what lets a `columns` block embed (and edit)
 * sibling blocks nested inside it.
 *
 * Row identity lives in local state keyed by a stable id rather than the
 * positional index, so reordering moves a row's React subtree (preserving
 * focused inputs) while {@link reindexActions} re-homes the underlying leaf
 * paths — including the `blockType` leaf — to match the new order. The field
 * holds no value of its own; each row's values (and its `blockType`
 * discriminant) live at indexed leaf paths and reconstruct into an array of
 * block objects via `reduceFieldsToValues`.
 *
 * A row whose stored `blockType` is not in the field's allowed `blocks`
 * (forward-compatible content that ships before its descriptor) renders as an
 * inert no-op row rather than throwing — mirroring the dispatcher's graceful
 * degradation for unknown block types.
 *
 * @param props.field - The blocks descriptor, read for its allowed `blocks` and `minRows`/`maxRows`.
 * @param props.path - The blocks field's dotted form-state path.
 * @param props.registry - The registry used to dispatch each block's nested fields.
 * @returns The rendered block rows with their controls and an add control.
 * @throws {MissingContextProviderError} When used outside a `<Form>`.
 */
export function BlocksField({ field, path, registry }: FieldRendererProps<BlocksFieldDescriptor>) {
    const [state, dispatch] = useAllFormFields();
    const idCounter = useRef(0);
    const [rows, setRows] = useState<BlockRow[]>(() => {
        const count = Math.max(deriveRowIndices(state, path).length, field.minRows ?? 0);
        return Array.from({ length: count }, () => ({ id: `block-${idCounter.current++}` }));
    });
    const [pendingType, setPendingType] = useState<string>(() => field.blocks[0]?.slug ?? '');

    const blocksBySlug = new Map<string, BlockDescriptor>(field.blocks.map((block) => [block.slug, block]));
    const atMin = rows.length <= (field.minRows ?? 0);
    const atMax = field.maxRows !== undefined && rows.length >= field.maxRows;

    /**
     * Append a block instance of the picked type, seeding its `blockType`
     * discriminant leaf; the block's own field leaves are created lazily on
     * first edit.
     */
    const addRow = () => {
        if (atMax || !pendingType) return;
        const index = rows.length;
        setRows([...rows, { id: `block-${idCounter.current++}` }]);
        dispatch({ type: 'UPDATE', path: `${path}.${index}.blockType`, value: pendingType, valid: true });
    };

    /**
     * Drop the block at `index`, shifting the trailing rows' leaf paths down.
     *
     * @param index - Positional index of the row to remove.
     */
    const removeRow = (index: number) => {
        if (atMin) return;
        const order = rows.map((_, i) => i).filter((i) => i !== index);
        applyOrder({ state, dispatch, path, rows, order, setRows });
    };

    /**
     * Swap the block at `index` with its neighbor in `direction`, re-homing both
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
        <div data-testid={`blocks-${path}`} className="flex flex-col gap-3">
            {rows.map((row, index) => {
                const blockType = rowBlockType(state, path, index);
                const descriptor = blockType !== undefined ? blocksBySlug.get(blockType) : undefined;
                const blockLabel = descriptor?.labels?.singular ?? blockType ?? 'Block';
                return (
                    <div
                        key={row.id}
                        data-testid={`blocks-row-${path}`}
                        data-row-id={row.id}
                        data-row-index={index}
                        data-block-type={blockType}
                        className={rowCardClassName}
                    >
                        <div className={rowHeaderClassName}>
                            <span className={rowTitleClassName}>{blockLabel}</span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    data-testid={`blocks-move-up-${path}-${index}`}
                                    aria-label="Move block up"
                                    disabled={index === 0}
                                    onClick={() => moveRow(index, -1)}
                                    className={iconButtonClassName}
                                >
                                    ↑
                                </button>
                                <button
                                    type="button"
                                    data-testid={`blocks-move-down-${path}-${index}`}
                                    aria-label="Move block down"
                                    disabled={index === rows.length - 1}
                                    onClick={() => moveRow(index, 1)}
                                    className={iconButtonClassName}
                                >
                                    ↓
                                </button>
                                <button
                                    type="button"
                                    data-testid={`blocks-remove-${path}-${index}`}
                                    aria-label="Remove block"
                                    disabled={atMin}
                                    onClick={() => removeRow(index)}
                                    className={removeButtonClassName}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                        {descriptor ? (
                            <RenderFields
                                registry={registry}
                                fields={descriptor.fields}
                                parentPath={`${path}.${index}`}
                            />
                        ) : (
                            <div data-testid={`blocks-unknown-${path}-${index}`} data-block-type={blockType} />
                        )}
                    </div>
                );
            })}
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border border-dashed bg-muted/20 p-2">
                <select
                    data-testid={`blocks-picker-${path}`}
                    aria-label="Block type"
                    value={pendingType}
                    onChange={(event) => setPendingType(event.target.value)}
                    className={pickerSelectClassName}
                >
                    {field.blocks.map((block) => (
                        <option key={block.slug} value={block.slug}>
                            {block.labels?.singular ?? block.slug}
                        </option>
                    ))}
                </select>
                <button
                    type="button"
                    data-testid={`blocks-add-${path}`}
                    disabled={atMax || !pendingType}
                    onClick={addRow}
                    className={addButtonClassName}
                >
                    <span aria-hidden="true" className="text-base leading-none">
                        +
                    </span>
                    Add block
                </button>
            </div>
        </div>
    );
}

'use client';

import { useState } from 'react';
import type { ResponsiveFieldDescriptor, ScalarFieldDescriptor } from '../../../descriptors/types';
import { BREAKPOINTS, type Breakpoint, breakpointLabel, isBreakpoint } from '../../../responsive';
import { useAllFormFields } from '../hooks';
import type { FieldRendererProps } from '../registry';
import { RenderFields } from '../registry';
import type { FormState } from '../types';
import { pickerSelectClassName, removeButtonClassName } from './control-styles';

/**
 * The breakpoints currently present under `path` — always including `base` — in
 * ascending scale order. Derived from which `${path}.<breakpoint>` leaves exist
 * in form state (mirrors how the array widget reads its rows).
 *
 * @param state - The live form state.
 * @param path - The responsive field's dotted path.
 * @returns The active breakpoints, ascending.
 */
function activeBreakpoints(state: FormState, path: string): Breakpoint[] {
    const prefix = `${path}.`;
    const present = new Set<Breakpoint>(['base']);
    for (const key of Object.keys(state)) {
        if (!key.startsWith(prefix)) continue;
        const head = key.slice(prefix.length).split('.')[0];
        if (isBreakpoint(head)) present.add(head);
    }
    return BREAKPOINTS.filter((breakpoint) => present.has(breakpoint));
}

/**
 * The current leaf value at each breakpoint, used to seed a newly-added one.
 *
 * @param state - The live form state.
 * @param path - The responsive field's dotted path.
 * @returns A partial breakpoint → value map.
 */
function leafValues(state: FormState, path: string): Partial<Record<Breakpoint, unknown>> {
    const out: Partial<Record<Breakpoint, unknown>> = {};
    for (const breakpoint of BREAKPOINTS) {
        const leaf = state[`${path}.${breakpoint}`];
        if (leaf?.value !== undefined) out[breakpoint] = leaf.value;
    }
    return out;
}

/**
 * The seed value for a newly-added breakpoint: the nearest defined value at or
 * below it (so a new override starts from what already renders there), falling
 * back to the descriptor default map, then the wrapped field's first option.
 *
 * @param field - The wrapped scalar field.
 * @param defaults - The responsive descriptor's `defaultValue` map.
 * @param values - The current per-breakpoint leaf values.
 * @param target - The breakpoint being added.
 * @returns The seed value.
 */
function seedValue(
    field: ScalarFieldDescriptor,
    defaults: Record<string, unknown> | undefined,
    values: Partial<Record<Breakpoint, unknown>>,
    target: Breakpoint,
): unknown {
    const start = BREAKPOINTS.indexOf(target);
    // The value already rendering at `target` — the nearest actually-set leaf below it.
    for (let index = start; index >= 0; index--) {
        const value = values[BREAKPOINTS[index]!];
        if (value !== undefined) return value;
    }
    // Nothing set yet: fall back to the descriptor default cascade, then the field's first option.
    for (let index = start; index >= 0; index--) {
        const value = defaults?.[BREAKPOINTS[index]!];
        if (value !== undefined) return value;
    }
    return field.type === 'select' ? field.options[0]?.value : field.defaultValue;
}

/**
 * Editor widget for a {@link ResponsiveFieldDescriptor}. Renders the wrapped
 * scalar field once per active breakpoint — each labeled with its human device
 * name (Mobile/Tablet/…) — plus a device dropdown to add a breakpoint override
 * and a remove control on every non-`base` row. Each row's value lives at
 * `${path}.<breakpoint>`, reconstructing into a `{ base, md, … }` map.
 *
 * @param props.field - The responsive descriptor (wrapped `field` + `defaultValue`).
 * @param props.path - The responsive field's dotted form path.
 * @param props.registry - Registry used to render the wrapped field per breakpoint.
 * @returns The responsive field editor.
 * @throws {MissingContextProviderError} When used outside a `<Form>`.
 */
export function ResponsiveField({ field, path, registry }: FieldRendererProps<ResponsiveFieldDescriptor>) {
    const [state, dispatch] = useAllFormFields();
    const [pendingAdd, setPendingAdd] = useState('');

    const active = activeBreakpoints(state, path);
    const addable = BREAKPOINTS.filter((breakpoint) => !active.includes(breakpoint));

    /**
     * Add an override at `breakpoint`, seeded from the value that already renders there.
     *
     * @param breakpoint - The breakpoint to add.
     */
    const addBreakpoint = (breakpoint: Breakpoint) => {
        if (active.includes(breakpoint)) return;
        dispatch({
            type: 'UPDATE',
            path: `${path}.${breakpoint}`,
            value: seedValue(field.field, field.defaultValue, leafValues(state, path), breakpoint),
        });
    };

    /**
     * Remove the override at `breakpoint` (and any nested leaves).
     *
     * @param breakpoint - The breakpoint to remove.
     */
    const removeBreakpoint = (breakpoint: Breakpoint) => {
        const leaf = `${path}.${breakpoint}`;
        for (const key of Object.keys(state)) {
            if (key === leaf || key.startsWith(`${leaf}.`)) dispatch({ type: 'REMOVE', path: key });
        }
    };

    return (
        <fieldset
            data-testid={`responsive-${path}`}
            className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-card/20 p-4"
        >
            {field.label ? (
                <legend className="px-1.5 font-semibold text-foreground text-sm">{field.label}</legend>
            ) : null}

            {active.map((breakpoint) => (
                <div
                    key={breakpoint}
                    data-testid={`responsive-row-${path}-${breakpoint}`}
                    data-breakpoint={breakpoint}
                    className="flex items-end gap-2"
                >
                    <div className="grow">
                        <RenderFields
                            registry={registry}
                            fields={[{ ...field.field, name: breakpoint, label: breakpointLabel(breakpoint) }]}
                            parentPath={path}
                        />
                    </div>
                    {breakpoint !== 'base' ? (
                        <button
                            type="button"
                            data-testid={`responsive-remove-${path}-${breakpoint}`}
                            aria-label={`Remove ${breakpointLabel(breakpoint)} override`}
                            onClick={() => removeBreakpoint(breakpoint)}
                            className={removeButtonClassName}
                        >
                            Remove
                        </button>
                    ) : null}
                </div>
            ))}

            {addable.length > 0 ? (
                <select
                    data-testid={`responsive-add-${path}`}
                    aria-label="Add breakpoint"
                    value={pendingAdd}
                    onChange={(event) => {
                        const next = event.target.value;
                        if (isBreakpoint(next)) addBreakpoint(next);
                        setPendingAdd('');
                    }}
                    className={`self-start ${pickerSelectClassName}`}
                >
                    <option value="">Add device…</option>
                    {addable.map((breakpoint) => (
                        <option key={breakpoint} value={breakpoint}>
                            {breakpointLabel(breakpoint)}
                        </option>
                    ))}
                </select>
            ) : null}
        </fieldset>
    );
}

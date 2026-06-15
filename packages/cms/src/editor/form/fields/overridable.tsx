'use client';

import { useState } from 'react';
import type { OverridableFieldDescriptor } from '../../../descriptors/types';
import { useAllFormFields } from '../hooks';
import type { FieldRendererProps } from '../registry';

const toggleButtonClassName =
    'flex items-center gap-1.5 rounded-md px-3 py-1.5 font-bold text-xs uppercase tracking-wide transition-colors';

/**
 * Whether a stored value counts as an active override (vs. inherit). Empty string and nullish are
 * treated as "no override" so an unset select reads as inherit.
 *
 * @param value - The raw form-state value at the field path.
 * @returns `true` when the value is an explicit override.
 */
function isOverride(value: unknown): boolean {
    return value !== undefined && value !== null && value !== '';
}

/**
 * Inherit/override control for an {@link OverridableFieldDescriptor}. The wrapped scalar widget is
 * rendered directly at this field's path (reusing its native `field-<path>` shell) when overriding,
 * so the stored value is the plain scalar — presence = override, absence = inherit. Toggling to
 * Inherit removes the value leaf so the cascade falls through to the next tier.
 *
 * @param props.field - The overridable descriptor wrapping a scalar field.
 * @param props.path - Dotted form-state path the wrapped value stores at.
 * @param props.registry - Field registry used to resolve the wrapped scalar widget.
 * @returns The inherit/override control.
 */
export function OverridableField({ field, path, registry }: FieldRendererProps<OverridableFieldDescriptor>) {
    const [state, dispatch] = useAllFormFields();
    const stored = state[path]?.value;
    const [overriding, setOverriding] = useState(() => isOverride(stored));
    const mode = overriding || isOverride(stored) ? 'override' : 'inherit';

    const toInherit = () => {
        setOverriding(false);
        for (const key of Object.keys(state)) {
            if (key === path || key.startsWith(`${path}.`)) dispatch({ type: 'REMOVE', path: key });
        }
    };

    const WrappedRenderer = registry.get(field.field.type);

    return (
        <div data-testid={`overridable-${path}`} className="flex min-w-0 flex-col gap-1.5">
            <span className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                {field.label ?? field.name}
            </span>
            <div
                role="group"
                aria-label="Inherit or override"
                className="inline-flex w-fit gap-1 rounded-lg border border-border bg-card/40 p-1"
            >
                <button
                    type="button"
                    data-testid={`override-inherit-${path}`}
                    aria-pressed={mode === 'inherit'}
                    onClick={toInherit}
                    className={`${toggleButtonClassName} ${
                        mode === 'inherit' ? 'bg-background text-foreground' : 'text-muted-foreground'
                    }`}
                >
                    Inherit
                </button>
                <button
                    type="button"
                    data-testid={`override-override-${path}`}
                    aria-pressed={mode === 'override'}
                    onClick={() => setOverriding(true)}
                    className={`${toggleButtonClassName} ${
                        mode === 'override' ? 'bg-background text-foreground' : 'text-muted-foreground'
                    }`}
                >
                    Override
                </button>
            </div>
            {mode === 'override' && WrappedRenderer ? (
                <WrappedRenderer field={{ ...field.field, label: undefined }} path={path} registry={registry} />
            ) : (
                <p
                    data-testid={`override-inherited-${path}`}
                    className="rounded-md border border-border border-dashed bg-card/30 px-3 py-2 text-muted-foreground text-sm"
                >
                    Inherited{field.inheritedSourceLabel ? ` · ${field.inheritedSourceLabel}` : ''}
                </p>
            )}
        </div>
    );
}

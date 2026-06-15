import type { OverridableFieldDescriptor, ScalarFieldDescriptor } from './types';

/**
 * Stored shape of an overridable field. `inherit` contributes no key to the resolved manifest so
 * the cascade falls through to the next tier; `override` carries the wrapped value.
 */
export type OverridableValue<T = unknown> = { __mode: 'inherit' } | { __mode: 'override'; value: T };

/** Canonical inherit sentinel — the default/empty state of an overridable field. */
export const OVERRIDE_INHERIT: OverridableValue = { __mode: 'inherit' };

/**
 * Wraps a scalar field so the editor exposes an explicit inherit/override control. The wrapped
 * field's `name` becomes the overridable descriptor's `name`; the widget re-keys the wrapped field
 * to `value`, so the override value stores at `<name>.value`.
 *
 * @param field - The scalar field to make overridable.
 * @param options - Optional config; `inheritedSourceLabel` labels the inherit ghost.
 * @returns The overridable descriptor.
 */
export const overridable = (
    field: ScalarFieldDescriptor,
    options?: { inheritedSourceLabel?: string },
): OverridableFieldDescriptor => ({
    type: 'overridable',
    name: field.name,
    label: field.label,
    field,
    inheritedSourceLabel: options?.inheritedSourceLabel,
});

/**
 * Collapses a stored overridable value to its manifest representation: `override` yields the wrapped
 * value, `inherit` (or absent) yields `undefined` so the key is omitted and the cascade falls through.
 *
 * @param stored - The stored overridable value, or `undefined`.
 * @returns The effective value, or `undefined` when inheriting.
 */
export const collapseOverridable = <T>(stored: OverridableValue<T> | undefined): T | undefined =>
    stored !== undefined && stored.__mode === 'override' ? stored.value : undefined;

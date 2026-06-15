import type { OverridableFieldDescriptor, ScalarFieldDescriptor } from './types';

/**
 * Wraps a scalar field so the editor exposes an explicit inherit/override control for cascading
 * store defaults. The wrapped field's value stores at the descriptor's own path: presence means
 * "override with this value", absence means "inherit" (the resolver omits the key and the cascade
 * falls through to the next tier). The descriptor's `name` is taken from the wrapped field.
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

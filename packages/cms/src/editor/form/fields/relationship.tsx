'use client';

import { MissingContextProviderError } from '@nordcom/commerce-errors';
import { createContext, type ReactNode, useContext } from 'react';

import type { RelationshipFieldDescriptor } from '../../../descriptors/types';
import type { FieldRegistry, FieldRendererProps } from '../registry';
import { FieldShell, fieldControlClassName, useEditorField } from './field-shell';
import { UploadField } from './upload';

/**
 * A single selectable document, projected from a related collection's Convex
 * query into the shape the picker renders. `id` is the document's Convex id,
 * the value written into form state; `label` is the human-readable option text.
 */
export type RelationshipOption = {
    /** The related document's Convex id — what the field stores when selected. */
    id: string;
    /** The option's display text. */
    label: string;
};

/**
 * The data-binding seam the relationship widget reads its options through.
 * Given a target collection slug, return the documents available to pick. The
 * admin host implements this against the relevant Convex content-table query;
 * the widget stays free of any `convex/react` dependency so it remains a pure,
 * testable Client Component.
 *
 * @param relationTo - The related collection slug ({@link RelationshipFieldDescriptor.relationTo}).
 * @returns The options to list for that collection.
 */
export type RelationshipQuery = (relationTo: string) => RelationshipOption[];

const RelationshipQueryContext = createContext<RelationshipQuery | null>(null);

/**
 * Provide the Convex-backed option source the {@link RelationshipField} widgets
 * beneath it read through. Kept as an explicit seam so the host wires the live
 * query while the widget — and its tests — depend only on this interface.
 *
 * @param props.query - Resolver from a collection slug to its pickable options.
 * @param props.children - The subtree that may render relationship widgets.
 * @returns The provider wrapping `children`.
 */
export function RelationshipQueryProvider({ query, children }: { query: RelationshipQuery; children: ReactNode }) {
    return <RelationshipQueryContext.Provider value={query}>{children}</RelationshipQueryContext.Provider>;
}

/**
 * Read the options for a related collection from the nearest
 * {@link RelationshipQueryProvider}. Throwing when unprovided keeps the data
 * dependency explicit rather than silently rendering an empty picker.
 *
 * @param relationTo - The related collection slug to list options for.
 * @returns The options for that collection.
 * @throws {MissingContextProviderError} When no provider wraps the call site.
 */
export function useRelationshipOptions(relationTo: string): RelationshipOption[] {
    const query = useContext(RelationshipQueryContext);
    if (!query) throw new MissingContextProviderError('useRelationshipOptions', 'RelationshipQueryProvider');
    return query(relationTo);
}

/**
 * Document-picker widget. Lists the related collection's documents — sourced
 * from a Convex content-table query through the {@link RelationshipQueryProvider}
 * seam — and writes the selected document id into form state. `hasMany` renders
 * a multi-select that stores an ordered id array; otherwise a single id is
 * stored. Condition-gated and required-aware like the scalar widgets: a hidden
 * field is pruned from the `_payload` blob, and `required` is enforced through
 * native form validation.
 *
 * @param props.field - The relationship descriptor.
 * @param props.path - The field's dotted form-state path.
 * @returns The bound picker, or `null` when its condition hides it.
 */
export function RelationshipField({ field, path }: FieldRendererProps<RelationshipFieldDescriptor>) {
    const { value, setValue, visible, error } = useEditorField<string | string[]>(field, path);
    const options = useRelationshipOptions(field.relationTo);
    if (!visible) return null;

    const hasMany = field.hasMany === true;
    const selected: string | string[] = hasMany
        ? Array.isArray(value)
            ? value
            : []
        : typeof value === 'string'
          ? value
          : '';

    return (
        <FieldShell htmlFor={path} label={field.label ?? field.name} required={field.required} errorMessage={error}>
            <select
                id={path}
                multiple={hasMany}
                required={field.required}
                value={selected}
                onChange={(event) =>
                    hasMany
                        ? setValue(Array.from(event.target.selectedOptions, (option) => option.value))
                        : setValue(event.target.value)
                }
                className={fieldControlClassName}
            >
                {hasMany ? null : <option value="">Select…</option>}
                {options.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.label}
                    </option>
                ))}
            </select>
        </FieldShell>
    );
}

/**
 * Register the data-bound `relationship` and `upload` widgets into a field
 * registry. Kept separate from the scalar/composite registrars because both
 * widgets depend on a host-provided data seam — the relationship query and the
 * upload action — so a surface opts in only once those providers are wired.
 * Registration is last-write-wins; returns the registry for call-site chaining.
 *
 * @param registry - The registry to populate.
 * @returns The registry, with the relationship and upload widgets registered.
 */
export function registerDataBoundFieldWidgets(registry: FieldRegistry): FieldRegistry {
    registry.register('relationship', RelationshipField);
    registry.register('upload', UploadField);
    return registry;
}

'use client';

import type { GroupFieldDescriptor } from '../../../descriptors/types';
import type { FieldRendererProps } from '../registry';
import { RenderFields } from '../registry';

/**
 * Named group container widget. A group introduces a single data key but holds
 * no value of its own — its children store their values at dotted paths nested
 * under the group's `path`. The widget renders a labeled section and recurses
 * through {@link RenderFields} with its own `path` as the new `parentPath`, so
 * the same dispatch registry drives the nested fields. This recursion is what
 * lets a `linkField` group sit inside a nav-item array row at any depth.
 *
 * Group conditions (`admin.condition`) are not evaluated here: condition
 * gating for container fields is owned by the standalone `ConditionalField`
 * wrapper, so a single authority prunes the whole subtree rather than each
 * descendant racing to prune itself.
 *
 * @param props.field - The group descriptor.
 * @param props.path - The group's dotted form-state path (e.g. `items.0.link`).
 * @param props.registry - The registry used to dispatch the nested fields.
 * @returns The labeled group section wrapping its rendered children.
 */
export function GroupField({ field, path, registry }: FieldRendererProps<GroupFieldDescriptor>) {
    return (
        <fieldset data-testid={`group-${path}`} className="flex flex-col gap-3 rounded-md border border-border p-3">
            {field.label ? <legend className="px-1 font-medium text-foreground text-sm">{field.label}</legend> : null}
            <RenderFields registry={registry} fields={field.fields} parentPath={path} />
        </fieldset>
    );
}

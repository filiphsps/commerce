'use client';

import type { ComponentType } from 'react';
import type { FieldDescriptor, FieldDescriptorKind } from '../../descriptors/types';

/**
 * Props every field renderer receives. Container kinds (`group`, `array`,
 * `blocks`, `collapsible`) recurse by rendering {@link RenderFields} again with
 * the same `registry` and their own `path` as the new `parentPath`.
 */
export type FieldRendererProps<TField extends FieldDescriptor = FieldDescriptor> = {
    /** The descriptor being rendered. */
    field: TField;
    /** The field's dotted path within the form state (e.g. `seo.title`). */
    path: string;
    /** The registry, so container renderers can recurse into nested fields. */
    registry: FieldRegistry;
};

/** A component that renders a single descriptor kind. */
export type FieldRenderer<TField extends FieldDescriptor = FieldDescriptor> = ComponentType<FieldRendererProps<TField>>;

/**
 * Extensible map from descriptor kind → renderer component. The
 * `RenderFields`-equivalent: later CMSFORM tasks register widgets per kind
 * without touching this core. Registration is last-write-wins so a host can
 * override a built-in renderer.
 */
export type FieldRegistry = {
    /**
     * Register the renderer for a descriptor kind.
     *
     * @param kind - The descriptor `type` tag (e.g. `text`, `array`).
     * @param renderer - Component that renders descriptors of that kind.
     */
    register: <K extends FieldDescriptorKind>(
        kind: K,
        renderer: FieldRenderer<Extract<FieldDescriptor, { type: K }>>,
    ) => void;
    /**
     * Resolve the renderer registered for a kind, or `undefined` when none is.
     *
     * @param kind - The descriptor `type` tag.
     * @returns The renderer, or `undefined`.
     */
    get: (kind: FieldDescriptorKind) => FieldRenderer | undefined;
};

/**
 * Create an empty {@link FieldRegistry}. Each editor surface owns its own
 * instance so registrations never leak across forms.
 *
 * @returns A fresh, empty registry.
 */
export function createFieldRegistry(): FieldRegistry {
    const renderers = new Map<FieldDescriptorKind, FieldRenderer>();
    return {
        register(kind, renderer) {
            renderers.set(kind, renderer as FieldRenderer);
        },
        get(kind) {
            return renderers.get(kind);
        },
    };
}

/**
 * Compute a field's dotted path. Named descriptors append their `name` to the
 * parent path; the presentational `collapsible` carries no data key, so it
 * keeps the parent path unchanged.
 *
 * @param field - The descriptor.
 * @param parentPath - The dotted path of the enclosing scope.
 * @returns The field's dotted path.
 */
function fieldPath(field: FieldDescriptor, parentPath: string): string {
    if (field.type === 'collapsible') return parentPath;
    return parentPath ? `${parentPath}.${field.name}` : field.name;
}

/**
 * Stable React key + fallback test id segment for a descriptor — its `name`,
 * or its `type` for the unnamed `collapsible`.
 *
 * @param field - The descriptor.
 * @returns A key segment.
 */
function fieldKey(field: FieldDescriptor): string {
    return field.type === 'collapsible' ? field.type : field.name;
}

/**
 * Props for {@link RenderFields}.
 */
export type RenderFieldsProps = {
    /** The registry to dispatch each descriptor through. */
    registry: FieldRegistry;
    /** The descriptors to render, in order. */
    fields: FieldDescriptor[];
    /** Dotted path of the enclosing scope; `''` at the document root. */
    parentPath: string;
};

/**
 * Walk a descriptor list and render each field through its registered
 * renderer. The Payload `<RenderFields>` replacement. Descriptors
 * whose kind has no registered renderer fall back to an inert placeholder
 * (mirroring Payload's `mockRSCs` behavior) so an unmigrated field type never
 * crashes the editor.
 *
 * @param props.registry - Registry to dispatch through.
 * @param props.fields - Descriptors to render.
 * @param props.parentPath - Dotted path of the enclosing scope.
 * @returns The rendered field nodes.
 */
export function RenderFields({ registry, fields, parentPath }: RenderFieldsProps) {
    return (
        <>
            {fields.map((field) => {
                const key = fieldKey(field);
                const Renderer = registry.get(field.type);
                if (!Renderer) {
                    return <div key={key} data-testid={`unsupported-field-${key}`} data-field-kind={field.type} />;
                }
                return <Renderer key={key} field={field} path={fieldPath(field, parentPath)} registry={registry} />;
            })}
        </>
    );
}

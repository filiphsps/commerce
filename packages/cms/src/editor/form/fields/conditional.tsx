'use client';

import { useEffect, useMemo, useRef } from 'react';

import type { FieldDescriptor } from '../../../descriptors/types';
import { useAllFormFields } from '../hooks';
import type { FieldRendererProps } from '../registry';
import { reduceFieldsToValues } from '../state';
import type { FormState } from '../types';

/**
 * Resolve the data scope a field's `condition` is evaluated against — the
 * object holding the field's immediate siblings. A top-level field's siblings
 * are the document root; a nested field's siblings are its enclosing
 * group/array-row object. Returns an empty object when the parent scope is not
 * an object (e.g. a path into data not yet populated).
 *
 * Mirrors the sibling resolver the scalar widgets use through
 * {@link useEditorField}; kept local so the wrapper carries no dependency on
 * the leaf-widget module.
 *
 * @param data - The full document values, unflattened from form state.
 * @param path - The field's dotted path within the document.
 * @returns The parent-scope object containing the field's siblings.
 */
function getSiblingData(data: Record<string, unknown>, path: string): Record<string, unknown> {
    const segments = path.split('.');
    if (segments.length <= 1) return data;

    let cursor: Record<string, unknown> = data;
    for (let i = 0; i < segments.length - 1; i++) {
        const segment = segments[i];
        if (segment === undefined) return {};
        const next = cursor[segment];
        if (next === null || typeof next !== 'object') return {};
        cursor = next as Record<string, unknown>;
    }
    return cursor;
}

/**
 * Every form-state path that belongs to the subtree rooted at `path` — the path
 * itself plus everything nested beneath it. The dot guard stops `items.1` from
 * matching a sibling like `items.10`.
 *
 * @param state - The live form state.
 * @param path - The subtree root path.
 * @returns The matching paths.
 */
function subtreePaths(state: FormState, path: string): string[] {
    const prefix = `${path}.`;
    return Object.keys(state).filter((key) => key === path || key.startsWith(prefix));
}

/**
 * Strip a descriptor's `condition` so the wrapped renderer never gates itself.
 * {@link ConditionalField} is the single authority on visibility for its whole
 * subtree; a self-conditioning leaf would otherwise prune its own path before
 * the wrapper can snapshot it, breaking value restoration on re-show.
 *
 * @param field - The descriptor to clear the condition from.
 * @returns A structural copy with `admin.condition` removed, or the same descriptor when it carries no condition.
 */
function withoutCondition<TField extends FieldDescriptor>(field: TField): TField {
    if (!field.admin?.condition) return field;
    // Structural copy with the condition dropped; `type` is untouched so the
    // descriptor stays a valid member of its descriptor union.
    return { ...field, admin: { ...field.admin, condition: undefined } } as TField;
}

/**
 * Conditional-field wrapper. Evaluates a descriptor's `condition(data, sibling)`
 * against the live, unflattened form data and mounts the wrapped renderer only
 * while it returns `true`. Unlike the scalar widgets — which gate only their own
 * single path — this wrapper owns the field's entire subtree, so a hidden
 * `group`/`array` leaves no orphaned descendant values in the serialized blob.
 *
 * Hiding snapshots and removes every subtree path; re-showing restores the
 * captured values, so a field that toggles off and back on returns with what
 * the editor had typed. The prune runs on every state change (not only when
 * visibility flips) so a background `REPLACE_STATE` re-seed cannot smuggle a
 * hidden field's value back into the form. A field with no `condition` renders
 * its child unconditionally.
 *
 * Not registered by descriptor kind — `condition` is orthogonal to a field's
 * `type`. It is the wrapper the document form body composes around any field
 * whose visibility is data-driven.
 *
 * @param props.field - The descriptor to gate; read for its `admin.condition`.
 * @param props.path - The field's dotted form-state path / subtree root.
 * @param props.registry - The registry used to dispatch the wrapped field.
 * @returns The wrapped field when visible; `null` while its condition hides it.
 * @throws {MissingContextProviderError} When used outside a `<Form>`.
 */
export function ConditionalField({ field, path, registry }: FieldRendererProps) {
    const [state, dispatch] = useAllFormFields();
    const condition = field.admin?.condition;

    const visible = useMemo(() => {
        if (!condition) return true;
        const data = reduceFieldsToValues(state);
        return condition(data, getSiblingData(data, path));
    }, [condition, state, path]);

    // Captured subtree from the last time the field was hidden, replayed on
    // re-show. A ref (not state) so capturing never triggers a render.
    const remembered = useRef<FormState>({});
    const pruned = useRef(false);

    useEffect(() => {
        if (!condition) return;

        if (!visible) {
            const paths = subtreePaths(state, path);
            if (paths.length > 0) {
                const snapshot: FormState = {};
                for (const subPath of paths) {
                    const entry = state[subPath];
                    if (entry) snapshot[subPath] = entry;
                    dispatch({ type: 'REMOVE', path: subPath });
                }
                remembered.current = { ...remembered.current, ...snapshot };
            }
            pruned.current = true;
            return;
        }

        if (pruned.current) {
            for (const [subPath, entry] of Object.entries(remembered.current)) {
                dispatch({
                    type: 'UPDATE',
                    path: subPath,
                    value: entry.value,
                    valid: entry.valid,
                    errorMessage: entry.errorMessage,
                });
            }
            remembered.current = {};
        }
        pruned.current = false;
    }, [condition, visible, state, path, dispatch]);

    if (!visible) return null;

    const childField = withoutCondition(field);
    const Renderer = registry.get(childField.type);
    if (!Renderer) {
        const key = childField.type === 'collapsible' ? childField.type : childField.name;
        return <div data-testid={`unsupported-field-${key}`} data-field-kind={childField.type} />;
    }
    return <Renderer field={childField} path={path} registry={registry} />;
}

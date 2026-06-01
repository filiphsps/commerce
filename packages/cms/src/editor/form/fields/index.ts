/**
 * Leaf field widgets for the native CMS editor — the scalar half of the Payload
 * field-component replacement. Each widget is a `'use client'` renderer bound to
 * the form runtime through {@link useEditorField}, reusing the shared
 * {@link FieldShell} chrome, and is wired into a {@link FieldRegistry} via
 * {@link registerScalarFieldWidgets}. Container kinds (group/array/blocks/
 * collapsible) and the relationship/upload widgets land in later CMSFORM tasks.
 */

import type { FieldRegistry } from '../registry';
import {
    CheckboxField,
    CodeField,
    DateField,
    EmailField,
    JsonField,
    NumberField,
    SelectField,
    TextareaField,
    TextField,
} from './scalar-fields';

export { FieldShell, type FieldShellProps, fieldControlClassName, useEditorField } from './field-shell';
export {
    CheckboxField,
    CodeField,
    DateField,
    EmailField,
    JsonField,
    NumberField,
    SelectField,
    TextareaField,
    TextField,
} from './scalar-fields';

/**
 * Register the nine scalar leaf widgets into a field registry. Registration is
 * last-write-wins, so a host may override any of these afterward. Returns the
 * same registry for call-site chaining.
 *
 * @param registry - The registry to populate.
 * @returns The registry, with the scalar widgets registered.
 */
export function registerScalarFieldWidgets(registry: FieldRegistry): FieldRegistry {
    registry.register('text', TextField);
    registry.register('textarea', TextareaField);
    registry.register('select', SelectField);
    registry.register('checkbox', CheckboxField);
    registry.register('number', NumberField);
    registry.register('date', DateField);
    registry.register('email', EmailField);
    registry.register('json', JsonField);
    registry.register('code', CodeField);
    return registry;
}

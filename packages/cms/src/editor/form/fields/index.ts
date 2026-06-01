/**
 * Field widgets for the native CMS editor — the Payload field-component
 * replacement. Each widget is a `'use client'` renderer bound to the form
 * runtime, wired into a {@link FieldRegistry} via {@link registerScalarFieldWidgets}
 * (text/textarea/select/checkbox/number/date/email/json/code) and
 * {@link registerCompositeFieldWidgets} (group/array/collapsible/blocks). The
 * relationship/upload widgets land in CMSFORM-06. The condition-driven
 * {@link ConditionalField} wrapper is orthogonal to descriptor kind, so it is
 * exported but not self-registered.
 */

import type { FieldRegistry } from '../registry';
import { ArrayField } from './array';
import { BlocksField } from './blocks';
import { CollapsibleField } from './collapsible';
import { GroupField } from './group';
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

export { ArrayField } from './array';
export { BlocksField } from './blocks';
export { CollapsibleField } from './collapsible';
export { ConditionalField } from './conditional';
export { FieldShell, type FieldShellProps, fieldControlClassName, useEditorField } from './field-shell';
export { GroupField } from './group';
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

/**
 * Register the four composite container widgets — `group`, `array`, the
 * polymorphic `blocks`, and the presentational `collapsible` — into a field
 * registry. Registration is last-write-wins, so a host may override any of
 * these afterward. Returns the same registry for call-site chaining. The
 * widgets recurse through {@link RenderFields}, so a registry carrying both the
 * scalar and composite widgets renders an arbitrarily deep descriptor tree —
 * including a `columns` block nesting further blocks.
 *
 * @param registry - The registry to populate.
 * @returns The registry, with the composite widgets registered.
 */
export function registerCompositeFieldWidgets(registry: FieldRegistry): FieldRegistry {
    registry.register('group', GroupField);
    registry.register('array', ArrayField);
    registry.register('blocks', BlocksField);
    registry.register('collapsible', CollapsibleField);
    return registry;
}

import type { FieldRegistry } from '@nordcom/commerce-cms/editor/form';

import {
    AdminCheckboxField,
    AdminDateField,
    AdminEmailField,
    AdminNumberField,
    AdminTextareaField,
    AdminTextField,
} from './scalar-fields';

/**
 * Overrides the library's bare scalar leaf widgets with the admin's
 * design-system controls. Passed to `<EditorFields>` via the
 * `FieldWidgetsProvider` seam, so registration runs AFTER the built-ins
 * (last-write-wins) and only the kinds listed here are replaced — composites
 * (`group`/`array`/`blocks`), the rich-text `json` claim, and the data-bound
 * relationship/upload widgets keep their library renderers.
 *
 * The `select` kind is intentionally NOT overridden: it keeps the library's
 * native `<select>` (restyled via the shared field-control chrome) so it stays a
 * real form control — both the editor e2e specs and assistive tech drive it the
 * same way. `checkbox` upgrades to a nordstar `Switch` (a clearer toggle, and no
 * surface drives it as a raw checkbox).
 *
 * Module-level and side-effect-free so the reference stays stable across
 * renders (the registry memo in `<EditorFields>` depends on it).
 *
 * @param registry - The editor surface's field registry to extend.
 */
export function registerAdminFieldWidgets(registry: FieldRegistry): void {
    registry.register('text', AdminTextField);
    registry.register('textarea', AdminTextareaField);
    registry.register('number', AdminNumberField);
    registry.register('email', AdminEmailField);
    registry.register('date', AdminDateField);
    registry.register('checkbox', AdminCheckboxField);
}

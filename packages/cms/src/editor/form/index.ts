/**
 * Native client form runtime CORE for the CMS editor — the foundation that
 * replaces the Payload `Form`/`FormState`/`useField`/`RenderFields` runtime.
 * Descriptor-driven (see `../../descriptors/types`), carrying the dotted-path
 * form state, the dirty-tracking + InitialStateGate merge, and the extensible
 * field-renderer dispatch registry.
 *
 * Intentionally a PARTIAL core. The following Payload-parity surface is
 * deferred to CMSFORM-02..06, which build the field widgets on top:
 * - `useField.showError` (submit-gated error display) + the per-field
 *   `validate` hook.
 * - `useForm.setModified` (explicit modified override).
 * - `ADD_ROW` / `REMOVE_ROW` reducer actions for array/blocks fields.
 * - The two-argument `createFormData(overrides, opts)` form Payload exposes
 *   (this core takes a single `overrides` argument).
 */

export { FieldsContext, type FieldsContextValue, FormContext, type FormContextValue } from './context';
export {
    FieldShell,
    type FieldShellProps,
    fieldControlClassName,
    registerScalarFieldWidgets,
    useEditorField,
} from './fields';
export { Form, type FormProps } from './form';
export {
    type UseFieldResult,
    useAllFormFields,
    useField,
    useForm,
    useFormFields,
    useFormModified,
} from './hooks';
export { formReducer } from './reducer';
export {
    createFieldRegistry,
    type FieldRegistry,
    type FieldRenderer,
    type FieldRendererProps,
    RenderFields,
    type RenderFieldsProps,
} from './registry';
export { deepEqual, isFieldDirty, isFormModified, reduceFieldsToValues } from './state';
export type { FormAction, FormFieldState, FormState } from './types';

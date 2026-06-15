import type {
    ArrayFieldDescriptor,
    BlockDescriptor,
    BlocksFieldDescriptor,
    CheckboxFieldDescriptor,
    CodeFieldDescriptor,
    CollapsibleFieldDescriptor,
    DateFieldDescriptor,
    EmailFieldDescriptor,
    FieldCondition,
    FieldDescriptor,
    GroupFieldDescriptor,
    JsonFieldDescriptor,
    LocalizableFieldDescriptor,
    NamedFieldDescriptor,
    NumberFieldDescriptor,
    RelationshipFieldDescriptor,
    ResponsiveFieldDescriptor,
    SelectFieldDescriptor,
    TextareaFieldDescriptor,
    TextFieldDescriptor,
    UploadFieldDescriptor,
} from './types';

/**
 * Config accepted by a descriptor builder: the descriptor minus its `type`
 * tag, which the builder supplies.
 */
type BuilderConfig<TDescriptor extends { type: string }> = Omit<TDescriptor, 'type'>;

/**
 * Builds a single-line text field descriptor.
 *
 * @param config - Field options excluding the `type` tag.
 * @returns A {@link TextFieldDescriptor}.
 *
 * @example
 * textField({ name: 'title' });
 */
export const textField = (config: BuilderConfig<TextFieldDescriptor>): TextFieldDescriptor => ({
    type: 'text',
    ...config,
});

/**
 * Builds a multi-line text field descriptor.
 *
 * @param config - Field options excluding the `type` tag.
 * @returns A {@link TextareaFieldDescriptor}.
 */
export const textareaField = (config: BuilderConfig<TextareaFieldDescriptor>): TextareaFieldDescriptor => ({
    type: 'textarea',
    ...config,
});

/**
 * Builds an enumerated choice field descriptor.
 *
 * @param config - Field options excluding the `type` tag; must include `options`.
 * @returns A {@link SelectFieldDescriptor}.
 */
export const selectField = (config: BuilderConfig<SelectFieldDescriptor>): SelectFieldDescriptor => ({
    type: 'select',
    ...config,
});

/**
 * Builds a boolean toggle field descriptor.
 *
 * @param config - Field options excluding the `type` tag.
 * @returns A {@link CheckboxFieldDescriptor}.
 */
export const checkboxField = (config: BuilderConfig<CheckboxFieldDescriptor>): CheckboxFieldDescriptor => ({
    type: 'checkbox',
    ...config,
});

/**
 * Builds a numeric field descriptor.
 *
 * @param config - Field options excluding the `type` tag.
 * @returns A {@link NumberFieldDescriptor}.
 */
export const numberField = (config: BuilderConfig<NumberFieldDescriptor>): NumberFieldDescriptor => ({
    type: 'number',
    ...config,
});

/**
 * Builds a date/time field descriptor.
 *
 * @param config - Field options excluding the `type` tag.
 * @returns A {@link DateFieldDescriptor}.
 */
export const dateField = (config: BuilderConfig<DateFieldDescriptor>): DateFieldDescriptor => ({
    type: 'date',
    ...config,
});

/**
 * Builds an email field descriptor.
 *
 * @param config - Field options excluding the `type` tag.
 * @returns An {@link EmailFieldDescriptor}.
 */
export const emailField = (config: BuilderConfig<EmailFieldDescriptor>): EmailFieldDescriptor => ({
    type: 'email',
    ...config,
});

/**
 * Builds a free-form JSON field descriptor.
 *
 * @param config - Field options excluding the `type` tag.
 * @returns A {@link JsonFieldDescriptor}.
 */
export const jsonField = (config: BuilderConfig<JsonFieldDescriptor>): JsonFieldDescriptor => ({
    type: 'json',
    ...config,
});

/**
 * Builds a source-code field descriptor.
 *
 * @param config - Field options excluding the `type` tag.
 * @returns A {@link CodeFieldDescriptor}.
 */
export const codeField = (config: BuilderConfig<CodeFieldDescriptor>): CodeFieldDescriptor => ({
    type: 'code',
    ...config,
});

/**
 * Builds a relationship field descriptor. `TRelation` is inferred from the
 * passed `relationTo` so the target slug literal is preserved.
 *
 * @param config - Field options excluding the `type` tag; must include `relationTo`.
 * @returns A {@link RelationshipFieldDescriptor} pinned to the given target slug.
 */
export const relationshipField = <TRelation extends string>(
    config: BuilderConfig<RelationshipFieldDescriptor<TRelation>>,
): RelationshipFieldDescriptor<TRelation> => ({
    type: 'relationship',
    ...config,
});

/**
 * Builds an upload field descriptor. `TRelation` is inferred from the passed
 * `relationTo` so the target slug literal is preserved.
 *
 * @param config - Field options excluding the `type` tag; must include `relationTo`.
 * @returns An {@link UploadFieldDescriptor} pinned to the given target slug.
 */
export const uploadField = <TRelation extends string>(
    config: BuilderConfig<UploadFieldDescriptor<TRelation>>,
): UploadFieldDescriptor<TRelation> => ({
    type: 'upload',
    ...config,
});

/**
 * Builds a repeatable array field descriptor.
 *
 * @param config - Field options excluding the `type` tag; must include `fields`.
 * @returns An {@link ArrayFieldDescriptor}.
 */
export const arrayField = (config: BuilderConfig<ArrayFieldDescriptor>): ArrayFieldDescriptor => ({
    type: 'array',
    ...config,
});

/**
 * Builds a named group field descriptor.
 *
 * @param config - Field options excluding the `type` tag; must include `fields`.
 * @returns A {@link GroupFieldDescriptor}.
 */
export const groupField = (config: BuilderConfig<GroupFieldDescriptor>): GroupFieldDescriptor => ({
    type: 'group',
    ...config,
});

/**
 * Builds a polymorphic blocks field descriptor.
 *
 * @param config - Field options excluding the `type` tag; must include `blocks`.
 * @returns A {@link BlocksFieldDescriptor}.
 */
export const blocksField = (config: BuilderConfig<BlocksFieldDescriptor>): BlocksFieldDescriptor => ({
    type: 'blocks',
    ...config,
});

/**
 * Builds a presentational collapsible container descriptor.
 *
 * @param config - Container options excluding the `type` tag; must include `label` and `fields`.
 * @returns A {@link CollapsibleFieldDescriptor}.
 */
export const collapsibleField = (config: BuilderConfig<CollapsibleFieldDescriptor>): CollapsibleFieldDescriptor => ({
    type: 'collapsible',
    ...config,
});

/**
 * Builds a responsive field descriptor: the wrapped scalar `field` becomes
 * editable per breakpoint, storing a `{ base, sm?, md?, … }` value.
 *
 * @param config - Field options excluding the `type` tag; must include the wrapped `field`.
 * @returns A {@link ResponsiveFieldDescriptor}.
 *
 * @example
 * responsiveField({
 *     name: 'layout',
 *     field: selectField({ name: 'layout', options: [{ label: 'Grid', value: 'grid' }, { label: 'Carousel', value: 'carousel' }] }),
 *     defaultValue: { base: 'carousel', md: 'grid' },
 * });
 */
export const responsiveField = (config: BuilderConfig<ResponsiveFieldDescriptor>): ResponsiveFieldDescriptor => ({
    type: 'responsive',
    ...config,
});

/**
 * Defines a block variant for use inside a {@link blocksField}. Deliberately an
 * identity pass-through — {@link BlockDescriptor} carries no `type` discriminator
 * to inject, so this exists only for call-site API symmetry with the other
 * builders. Do not "simplify" it away.
 *
 * @param config - The block slug, its fields, and optional labels.
 * @returns A {@link BlockDescriptor}.
 */
export const block = (config: BlockDescriptor): BlockDescriptor => config;

/**
 * Marks a named leaf field as localized so the editor stores one value per
 * locale. Composite kinds (group/array/blocks) are rejected at the type level:
 * the native editor localizes leaves through per-field locale buckets and has
 * no per-locale storage for whole containers, so accepting them would silently
 * locale-share the container (G4FIX-03).
 *
 * @param field - The named leaf field descriptor to localize.
 * @returns The same descriptor with `localized` set to `true`.
 *
 * @example
 * localized(textField({ name: 'title' }));
 */
export const localized = <TField extends LocalizableFieldDescriptor>(field: TField): TField => ({
    ...field,
    localized: true,
});

/**
 * Marks a named field as required so the editor blocks saves with an empty
 * value.
 *
 * @param field - The named field descriptor to mark required.
 * @returns The same descriptor with `required` set to `true`.
 */
export const required = <TField extends NamedFieldDescriptor>(field: TField): TField => ({
    ...field,
    required: true,
});

/**
 * Gates a field's editor visibility and validation behind a predicate over the
 * document and sibling data.
 *
 * @param field - The descriptor to gate.
 * @param predicate - Returns `true` when the field should be shown and validated.
 * @returns The same descriptor with the condition attached to its admin metadata.
 *
 * @example
 * condition(textField({ name: 'url' }), (_data, sibling) => sibling.kind === 'external');
 */
export const condition = <TField extends FieldDescriptor>(field: TField, predicate: FieldCondition): TField => ({
    ...field,
    admin: { ...field.admin, condition: predicate },
});

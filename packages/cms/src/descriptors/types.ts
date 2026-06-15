/**
 * Convex-native field-descriptor type system. Replaces the CMS field type that
 * the previous Mongo-backed editor relied on, ahead of rebuilding the CMS
 * natively on Convex.
 *
 * These descriptors are intentionally a structural subset of the legacy editor
 * field shape: the ported builders' outputs must keep dropping into the
 * existing collection configs unchanged while the CMS is migrated collection by
 * collection. They carry no dependency on the legacy CMS runtime — the module
 * is pure TypeScript with no third-party imports, so it can be consumed from
 * any tier (codegen, form engine, Convex functions) without pulling editor or
 * React weight along.
 */

/**
 * Predicate that toggles a field's editor visibility and server-side
 * validation based on the document data and the data immediately adjacent to
 * the field (its siblings within the same group/array row).
 *
 * @param data - The full document being edited.
 * @param sibling - Fields sharing the same parent as this field.
 * @returns `true` when the field should be shown and validated.
 *
 * @example
 * const onlyWhenExternal: FieldCondition = (_data, sibling) => sibling.kind === 'external';
 */
export type FieldCondition = (data: Record<string, unknown>, sibling: Record<string, unknown>) => boolean;

/**
 * Editor-side metadata shared by every descriptor. Kept minimal — only the
 * `condition` hook is modeled, since that is the single piece of editor
 * behavior the field builders depend on.
 */
export type FieldDescriptorAdmin = {
    condition?: FieldCondition;
};

/**
 * Properties shared by every named field descriptor. Mirrors the base shape the
 * legacy editor expected so descriptor values remain assignable wherever a
 * legacy field was accepted.
 */
export type NamedFieldDescriptorBase = {
    name: string;
    label?: string;
    localized?: boolean;
    required?: boolean;
    admin?: FieldDescriptorAdmin;
};

/**
 * Base shape for the composite (container) descriptors — group, array, blocks.
 * Deliberately drops `localized`: composite localization was silently ignored
 * by the native editor (the whole container was shared across locales), so the
 * type system forbids declaring it at all — localize the text-ish leaf members
 * instead (G4FIX-03). The descriptor codegen enforces the same rule at runtime
 * for structurally-built schemas.
 */
export type CompositeFieldDescriptorBase = Omit<NamedFieldDescriptorBase, 'localized'>;

/**
 * Single-line text field descriptor. `hasMany` turns it into an ordered list of
 * strings (e.g. SEO keywords).
 */
export type TextFieldDescriptor = NamedFieldDescriptorBase & {
    type: 'text';
    hasMany?: boolean;
    defaultValue?: string;
};

/**
 * Multi-line text field descriptor.
 */
export type TextareaFieldDescriptor = NamedFieldDescriptorBase & {
    type: 'textarea';
    defaultValue?: string;
};

/**
 * A single choice within a {@link SelectFieldDescriptor}.
 */
export type SelectOptionDescriptor = {
    label: string;
    value: string;
};

/**
 * Enumerated single- or multi-choice field descriptor. `hasMany` allows
 * selecting more than one option.
 */
export type SelectFieldDescriptor = NamedFieldDescriptorBase & {
    type: 'select';
    options: SelectOptionDescriptor[];
    hasMany?: boolean;
    defaultValue?: string;
};

/**
 * Boolean toggle field descriptor.
 */
export type CheckboxFieldDescriptor = NamedFieldDescriptorBase & {
    type: 'checkbox';
    defaultValue?: boolean;
};

/**
 * Numeric field descriptor. `hasMany` turns it into an ordered list of numbers.
 */
export type NumberFieldDescriptor = NamedFieldDescriptorBase & {
    type: 'number';
    hasMany?: boolean;
    defaultValue?: number;
};

/**
 * Date/time field descriptor. The default value is an ISO-8601 string so the
 * descriptor stays serializable.
 */
export type DateFieldDescriptor = NamedFieldDescriptorBase & {
    type: 'date';
    defaultValue?: string;
};

/**
 * Email field descriptor — a text field that validates the address format.
 */
export type EmailFieldDescriptor = NamedFieldDescriptorBase & {
    type: 'email';
    defaultValue?: string;
};

/**
 * Free-form JSON field descriptor for structured editor-authored data.
 */
export type JsonFieldDescriptor = NamedFieldDescriptorBase & {
    type: 'json';
};

/**
 * Source-code field descriptor. `language` hints the editor's syntax
 * highlighting (e.g. `'html'`, `'css'`).
 */
export type CodeFieldDescriptor = NamedFieldDescriptorBase & {
    type: 'code';
    language?: string;
};

/**
 * Reference to one or more documents in another collection. `TRelation`
 * preserves the literal target slug so descriptor values stay precise; it
 * defaults to `string` for callers that do not pin the target at the type
 * level.
 */
export type RelationshipFieldDescriptor<TRelation extends string = string> = NamedFieldDescriptorBase & {
    type: 'relationship';
    relationTo: TRelation;
    hasMany?: boolean;
};

/**
 * Reference to an uploaded asset in another collection. `TRelation` preserves
 * the literal target slug.
 */
export type UploadFieldDescriptor<TRelation extends string = string> = NamedFieldDescriptorBase & {
    type: 'upload';
    relationTo: TRelation;
};

/**
 * Repeatable list of homogeneous rows, each row built from the same nested
 * field set. The recursive `fields` reference is what lets nav menus nest.
 */
export type ArrayFieldDescriptor = CompositeFieldDescriptorBase & {
    type: 'array';
    fields: FieldDescriptor[];
    minRows?: number;
    maxRows?: number;
};

/**
 * Named grouping of nested fields stored under a single key.
 */
export type GroupFieldDescriptor = CompositeFieldDescriptorBase & {
    type: 'group';
    fields: FieldDescriptor[];
};

/**
 * A selectable block variant within a {@link BlocksFieldDescriptor}.
 */
export type BlockDescriptor = {
    slug: string;
    fields: FieldDescriptor[];
    /**
     * Store-wide default settings for this block type, distinct from per-instance content `fields`.
     * Rendered in the Customization hub's Blocks tab (typically as `overridable()` descriptors) and
     * stored under `extensions.blockDefaults.<slug>.<name>`. A block with no behavioral defaults omits
     * this; a future custom block gains settings support simply by declaring it here.
     */
    settings?: FieldDescriptor[];
    labels?: {
        singular?: string;
        plural?: string;
    };
};

/**
 * Polymorphic list of blocks — the editor picks a block variant per row from
 * {@link BlockDescriptor.slug}.
 */
export type BlocksFieldDescriptor = CompositeFieldDescriptorBase & {
    type: 'blocks';
    blocks: BlockDescriptor[];
    minRows?: number;
    maxRows?: number;
};

/**
 * The non-composite (scalar) named descriptors — those whose value is a single
 * leaf. These are the fields a {@link ResponsiveFieldDescriptor} may wrap.
 */
export type ScalarFieldDescriptor =
    | TextFieldDescriptor
    | TextareaFieldDescriptor
    | SelectFieldDescriptor
    | CheckboxFieldDescriptor
    | NumberFieldDescriptor
    | DateFieldDescriptor
    | EmailFieldDescriptor;

/**
 * Wraps a scalar field so its value can vary per breakpoint. The editor renders
 * the inner `field` once per active breakpoint (Mobile/Tablet/Laptop/…) and an
 * "add breakpoint" device dropdown; the stored value is a `{ base, sm?, md?, … }`
 * map (a {@link ResponsiveValue}). The inner field's own `name` is ignored — this
 * descriptor owns the data key. Composite, so it is never localized; localize the
 * wrapped leaf instead if needed.
 */
export type ResponsiveFieldDescriptor = CompositeFieldDescriptorBase & {
    type: 'responsive';
    field: ScalarFieldDescriptor;
    defaultValue?: Record<string, unknown>;
};

/**
 * Wraps a scalar field with an explicit inherit/override control for cascading store defaults.
 * The stored value is an {@link import('./overridable').OverridableValue}: `inherit` (the default)
 * contributes NO key to the resolved manifest so the cascade falls through to the next tier;
 * `override` writes the wrapped value. Composite, so it is never localized itself — localize the
 * wrapped leaf instead. The inner field is re-keyed to `value` by the widget, so the override
 * value stores at `<name>.value`.
 */
export type OverridableFieldDescriptor = CompositeFieldDescriptorBase & {
    type: 'overridable';
    field: ScalarFieldDescriptor;
    /** Provenance label shown on the inherit ghost (e.g. "Platform default"). */
    inheritedSourceLabel?: string;
};

/**
 * Presentational, collapsible container. Unnamed — it groups fields visually
 * without introducing a data key, so it carries a `label` instead of a `name`.
 */
export type CollapsibleFieldDescriptor = {
    type: 'collapsible';
    label: string;
    fields: FieldDescriptor[];
    admin?: FieldDescriptorAdmin;
};

/**
 * Every descriptor that stores its value under a `name`. Excludes the
 * presentational {@link CollapsibleFieldDescriptor}, which has no data key.
 */
export type NamedFieldDescriptor =
    | TextFieldDescriptor
    | TextareaFieldDescriptor
    | SelectFieldDescriptor
    | CheckboxFieldDescriptor
    | NumberFieldDescriptor
    | DateFieldDescriptor
    | EmailFieldDescriptor
    | JsonFieldDescriptor
    | CodeFieldDescriptor
    | RelationshipFieldDescriptor
    | UploadFieldDescriptor
    | ArrayFieldDescriptor
    | GroupFieldDescriptor
    | BlocksFieldDescriptor
    | ResponsiveFieldDescriptor
    | OverridableFieldDescriptor;

/**
 * The named descriptors that may legally carry `localized: true` — every named
 * kind except the composites (group/array/blocks/responsive/overridable), whose types omit
 * the flag entirely (G4FIX-03).
 */
export type LocalizableFieldDescriptor = Exclude<
    NamedFieldDescriptor,
    | ArrayFieldDescriptor
    | GroupFieldDescriptor
    | BlocksFieldDescriptor
    | ResponsiveFieldDescriptor
    | OverridableFieldDescriptor
>;

/**
 * The full descriptor union accepted anywhere a field can appear, including the
 * presentational collapsible container.
 */
export type FieldDescriptor = NamedFieldDescriptor | CollapsibleFieldDescriptor;

/**
 * Literal union of every supported descriptor `type` tag.
 */
export type FieldDescriptorKind = FieldDescriptor['type'];

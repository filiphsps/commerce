import { allBlockDescriptors } from '../blocks';
import {
    arrayField,
    blocksField,
    checkboxField,
    dateField,
    emailField,
    type FieldDescriptor,
    groupField,
    jsonField,
    localized,
    numberField,
    relationshipField,
    required,
    selectField,
    textareaField,
    textField,
} from '../descriptors';
import { imageField, linkField, seoGroup, topLevelNavItemField } from '../fields';
import { LEGACY_TENANTS_SLUG } from '../legacy-tenants-slug';

/**
 * The editor-facing schema for one collection: the descriptor tree the native
 * `<EditorFields>` renders plus the drafts/autosave behavior the shell pages
 * previously read off the Payload collection config. Client-safe by
 * construction — descriptors and their `condition` hooks are plain values
 * defined in this module graph, so the Client Component field surface imports
 * them directly instead of receiving them across the RSC boundary (where the
 * condition functions could not travel).
 */
export type EditorCollectionSchema = {
    /** The descriptor tree, in render order. Plugin-injected fields (`tenant`, `_status`) are never modeled. */
    fields: FieldDescriptor[];
    /** Draft/version behavior; omitted means the collection has no drafts (explicit save only). */
    drafts?: { autosave?: { interval: number } };
    /**
     * When `true`, `json`-kind descriptors render through the rich-text widget
     * (the content surfaces, whose `json` fields ARE ProseMirror documents);
     * otherwise they render the raw JSON editor (settings surfaces like
     * feature flags).
     */
    richText?: boolean;
};

/** The shared 2s autosave the draft-bearing collections configure. */
const AUTOSAVE = { autosave: { interval: 2000 } } as const;

/**
 * Field descriptors for the `shops` editable surface (mirrors
 * `collections/shops.ts` minus the `theme` group, which is owned end to end by
 * the theme editor's bespoke field surface and is omitted from the default
 * rendered tree — its `theme.*` form-state paths still ride along from the
 * document data, exactly as `omitPaths` preserved them before).
 */
const shopsFields: FieldDescriptor[] = [
    required(textField({ name: 'name' })),
    textareaField({ name: 'description' }),
    required(textField({ name: 'domain' })),
    textField({ name: 'alternativeDomains', hasMany: true }),
    groupField({
        name: 'i18n',
        fields: [required(textField({ name: 'defaultLocale', defaultValue: 'en-US' }))],
    }),
    groupField({
        name: 'design',
        fields: [
            groupField({
                name: 'header',
                fields: [
                    groupField({
                        name: 'logo',
                        fields: [
                            required(textField({ name: 'src' })),
                            required(textField({ name: 'alt' })),
                            required(numberField({ name: 'width', defaultValue: 512 })),
                            required(numberField({ name: 'height', defaultValue: 512 })),
                        ],
                    }),
                ],
            }),
            arrayField({
                name: 'accents',
                fields: [
                    required(
                        selectField({
                            name: 'type',
                            options: [
                                { label: 'primary', value: 'primary' },
                                { label: 'secondary', value: 'secondary' },
                            ],
                        }),
                    ),
                    required(textField({ name: 'color' })),
                    required(textField({ name: 'foreground' })),
                ],
            }),
        ],
    }),
];

/**
 * Editor schemas for every collection with an editor manifest, keyed by
 * collection slug — the native replacement for the `useConfig()` lookup the
 * Payload-era `<EditorFields>` performed. Each entry mirrors its collection
 * config's descriptor-built field set; raw Payload fields whose extra members
 * are storage/validation concerns (`index`, `unique`, `validate`) are
 * re-expressed through the DSL, which models only what the editor renders.
 *
 * Collections absent from this map render an empty field surface (matching the
 * legacy `getEntityConfig(...) === null` fallback).
 */
const EDITOR_COLLECTION_SCHEMAS: Record<string, EditorCollectionSchema> = {
    pages: {
        fields: [
            localized(required(textField({ name: 'title' }))),
            required(textField({ name: 'slug' })),
            blocksField({ name: 'blocks', blocks: allBlockDescriptors }),
            seoGroup(),
        ],
        drafts: AUTOSAVE,
        richText: true,
    },
    articles: {
        fields: [
            localized(required(textField({ name: 'title' }))),
            required(textField({ name: 'slug' })),
            required(textField({ name: 'author' })),
            dateField({ name: 'publishedAt' }),
            imageField({ name: 'cover' }),
            localized(textareaField({ name: 'excerpt' })),
            localized(jsonField({ name: 'body' })),
            textField({ name: 'tags', hasMany: true }),
            seoGroup(),
        ],
        drafts: AUTOSAVE,
        richText: true,
    },
    businessData: {
        fields: [
            textField({ name: 'legalName' }),
            emailField({ name: 'supportEmail' }),
            textField({ name: 'supportPhone' }),
            groupField({
                name: 'address',
                fields: [
                    textField({ name: 'line1' }),
                    textField({ name: 'line2' }),
                    textField({ name: 'city' }),
                    textField({ name: 'region' }),
                    textField({ name: 'postalCode' }),
                    textField({ name: 'country' }),
                ],
            }),
            arrayField({
                name: 'profiles',
                fields: [
                    required(textField({ name: 'platform' })),
                    required(textField({ name: 'handle' })),
                    textField({ name: 'url' }),
                ],
            }),
        ],
        drafts: AUTOSAVE,
    },
    footer: {
        fields: [
            arrayField({
                name: 'sections',
                fields: [
                    localized(required(textField({ name: 'title' }))),
                    arrayField({ name: 'links', fields: [linkField({ name: 'link' })] }),
                ],
            }),
            arrayField({
                name: 'social',
                fields: [
                    required(
                        selectField({
                            name: 'platform',
                            options: [
                                { label: 'Instagram', value: 'instagram' },
                                { label: 'Facebook', value: 'facebook' },
                                { label: 'TikTok', value: 'tiktok' },
                                { label: 'YouTube', value: 'youtube' },
                                { label: 'X / Twitter', value: 'x' },
                                { label: 'LinkedIn', value: 'linkedin' },
                            ],
                        }),
                    ),
                    required(textField({ name: 'url' })),
                ],
            }),
            arrayField({ name: 'legal', fields: [linkField({ name: 'link' })] }),
            localized(textField({ name: 'copyrightLine' })),
        ],
        drafts: AUTOSAVE,
    },
    search: {
        fields: [
            localized(textField({ name: 'heading' })),
            localized(textField({ name: 'subheading' })),
            arrayField({ name: 'popularSearches', fields: [localized(required(textField({ name: 'term' })))] }),
            blocksField({ name: 'blocks', blocks: allBlockDescriptors }),
            seoGroup(),
        ],
        drafts: AUTOSAVE,
    },
    header: {
        fields: [
            imageField({ name: 'logo' }),
            textField({ name: 'logoLink', defaultValue: '/' }),
            topLevelNavItemField({ depth: 6 }),
            groupField({
                name: 'localeSwitcher',
                fields: [
                    checkboxField({ name: 'enabled', defaultValue: true }),
                    localized(textField({ name: 'label' })),
                ],
            }),
            linkField({ name: 'cta' }),
        ],
        drafts: AUTOSAVE,
    },
    collectionMetadata: {
        fields: [
            required(textField({ name: 'shopifyHandle' })),
            localized(jsonField({ name: 'descriptionOverride' })),
            blocksField({ name: 'blocks', blocks: allBlockDescriptors }),
            seoGroup(),
        ],
        drafts: AUTOSAVE,
        richText: true,
    },
    productMetadata: {
        fields: [
            required(textField({ name: 'shopifyHandle' })),
            localized(jsonField({ name: 'descriptionOverride' })),
            blocksField({ name: 'blocks', blocks: allBlockDescriptors }),
            seoGroup(),
        ],
        drafts: AUTOSAVE,
        richText: true,
    },
    'feature-flags': {
        fields: [
            required(textField({ name: 'key' })),
            selectField({
                name: 'kind',
                options: [
                    { label: 'Behavior', value: 'behavior' },
                    { label: 'Section', value: 'section' },
                ],
            }),
            textareaField({ name: 'description' }),
            required(jsonField({ name: 'defaultValue' })),
            arrayField({
                name: 'options',
                fields: [required(textField({ name: 'label' })), required(jsonField({ name: 'value' }))],
            }),
            arrayField({
                name: 'targeting',
                fields: [
                    required(textField({ name: 'rule' })),
                    required(jsonField({ name: 'params' })),
                    required(jsonField({ name: 'value' })),
                    textField({ name: 'description' }),
                ],
            }),
        ],
    },
    shops: { fields: shopsFields },
    users: {
        fields: [
            required(emailField({ name: 'email' })),
            required(
                selectField({
                    name: 'role',
                    defaultValue: 'editor',
                    options: [
                        { label: 'Admin', value: 'admin' },
                        { label: 'Editor', value: 'editor' },
                    ],
                }),
            ),
        ],
    },
    media: {
        fields: [required(textField({ name: 'alt' })), localized(textField({ name: 'caption' }))],
    },
    reviews: {
        fields: [required(relationshipField({ name: 'shop', relationTo: 'shops' }))],
    },
    // The legacy `tenants` slug has no backing collection anymore (the plugin's
    // tenant collection is `shops`); its routes render an empty surface, the
    // same fallback the Payload-era lookup produced.
    [LEGACY_TENANTS_SLUG]: { fields: [] },
};

/** The empty fallback schema for collections without a registered entry. */
const EMPTY_SCHEMA: EditorCollectionSchema = { fields: [] };

/**
 * Resolve the editor schema for a collection slug, falling back to an empty
 * field surface for unknown collections so an unregistered slug renders
 * nothing rather than crashing the editor.
 *
 * @param collection - The collection slug.
 * @returns The collection's {@link EditorCollectionSchema}.
 */
export function editorCollectionSchema(collection: string): EditorCollectionSchema {
    return EDITOR_COLLECTION_SCHEMAS[collection] ?? EMPTY_SCHEMA;
}

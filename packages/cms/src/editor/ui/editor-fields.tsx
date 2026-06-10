'use client';

import { MissingConvexBridgeError } from '@nordcom/commerce-errors';
import { useMemo } from 'react';

import { editorCollectionSchema } from '../collection-fields';
import {
    createFieldRegistry,
    type FieldRegistry,
    FormLocaleProvider,
    registerCompositeFieldWidgets,
    registerDataBoundFieldWidgets,
    registerRichTextFieldWidget,
    registerScalarFieldWidgets,
    type RelationshipQuery,
    RelationshipQueryProvider,
    RenderFields,
    type UploadAction,
    UploadActionProvider,
} from '../form';

/**
 * Props for {@link EditorFields}.
 *
 * @example
 * <EditorFields collection="pages" />
 */
export type EditorFieldsProps = {
    /** Collection slug; selects the descriptor schema from `collection-fields.ts`. */
    collection: string;
    /**
     * Named top-level fields to drop from the RENDERED tree only. Form state is
     * seeded from the document data independently of the rendered descriptors,
     * so an omitted field's dotted paths stay live for `useField`/save even
     * when another surface (e.g. the theme editor) owns the UI for them.
     */
    omitPaths?: string[];
    /**
     * The active editing locale (the edit page's narrowed `?locale=`).
     * Localized leaves bind this locale's slot of their per-field bucket;
     * omitted falls back to `defaultLocale`.
     */
    locale?: string;
    /**
     * The tenant's default locale — the slot legacy plain (pre-bucket) values
     * are attributed to so they survive a locale-aware edit. Defaults to the
     * platform default `en-US`.
     */
    defaultLocale?: string;
};

/**
 * Placeholder option source for relationship pickers until the admin host
 * wires the live Convex content-table query (CMSGATE-02): every related
 * collection lists zero options, so the picker renders empty rather than
 * crashing on the missing provider.
 */
const emptyRelationshipQuery: RelationshipQuery = () => [];

/**
 * Placeholder upload transport until the admin host wires the Convex media
 * upload flow (CMSGATE-02). The widget catches the rejection and surfaces it
 * inline, so picking a file degrades to a visible error instead of a crash.
 *
 * @throws {MissingConvexBridgeError} Always, until the media transport is wired.
 */
const unwiredUploadAction: UploadAction = async () => {
    throw new MissingConvexBridgeError('media');
};

/**
 * Build the field registry for one collection surface: the scalar leaves, the
 * composite containers, the data-bound relationship/upload widgets, and — on
 * content surfaces only — the rich-text widget claiming the `json` kind
 * (registration is last-write-wins, so settings surfaces keep the raw JSON
 * editor).
 *
 * @param richText - Whether `json` descriptors render through the rich-text widget.
 * @returns The populated registry.
 */
function buildEditorFieldRegistry(richText: boolean): FieldRegistry {
    const registry = createFieldRegistry();
    registerScalarFieldWidgets(registry);
    registerCompositeFieldWidgets(registry);
    registerDataBoundFieldWidgets(registry);
    if (richText) registerRichTextFieldWidget(registry);
    return registry;
}

/**
 * Generic field surface for any CMS collection — the native renderer that
 * replaced Payload's `<RenderFields>` (CMSDATA-07). Resolves the collection's
 * descriptor schema from `collection-fields.ts` (a client-side import, so
 * descriptor `condition` functions never cross the RSC boundary) and walks it
 * through the CMSFORM widget registry. Plugin-era hidden fields (`tenant`,
 * `_status`) need no filtering: the descriptor schemas never model them.
 *
 * Must be rendered inside the native `<Form>` — every widget binds its dotted
 * path through `useEditorField`.
 *
 * @param props.collection - Collection slug to render fields for.
 * @param props.omitPaths - Named top-level fields to skip in the rendered tree
 *   without touching their form-state entries.
 * @param props.locale - Active editing locale for localized leaves.
 * @param props.defaultLocale - Tenant default locale (legacy plain-value attribution).
 * @returns The rendered descriptor tree.
 */
export function EditorFields({ collection, omitPaths, locale, defaultLocale }: EditorFieldsProps) {
    const schema = editorCollectionSchema(collection);
    const registry = useMemo(() => buildEditorFieldRegistry(schema.richText === true), [schema.richText]);

    const omit = new Set(omitPaths ?? []);
    const fields = schema.fields.filter((field) => !('name' in field && omit.has(field.name)));

    const resolvedDefault = defaultLocale ?? 'en-US';

    return (
        <FormLocaleProvider locale={locale ?? resolvedDefault} defaultLocale={resolvedDefault}>
            <RelationshipQueryProvider query={emptyRelationshipQuery}>
                <UploadActionProvider action={unwiredUploadAction}>
                    <RenderFields registry={registry} fields={fields} parentPath="" />
                </UploadActionProvider>
            </RelationshipQueryProvider>
        </FormLocaleProvider>
    );
}

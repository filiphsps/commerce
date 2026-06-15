'use client';

import { MissingConvexBridgeError } from '@nordcom/commerce-errors';
import { useMemo } from 'react';

import { editorCollectionSchema } from '../collection-fields';
import {
    createFieldRegistry,
    type FieldRegistry,
    type FieldWidgetExtension,
    FormLocaleProvider,
    type RelationshipOption,
    type RelationshipQuery,
    RelationshipQueryProvider,
    RenderFields,
    registerCompositeFieldWidgets,
    registerDataBoundFieldWidgets,
    registerRichTextFieldWidget,
    registerScalarFieldWidgets,
    type UploadAction,
    UploadActionProvider,
    useFieldWidgetExtension,
} from '../form';

/**
 * The serialized upload transport `EditorFields` adapts onto the widget seam — a `'use server'`
 * action reference (already bound to the tenant domain by the edit page), since a Client Component
 * prop must cross the RSC boundary. The widget hands over a `File`; the adapter packs it into the
 * `FormData` shape the admin's media-upload action consumes.
 *
 * @param formData - The upload payload (`file` + required `alt`).
 * @returns The persisted media document's id.
 */
export type EditorFieldsUploadAction = (formData: FormData) => Promise<{ id: string }>;

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
    /**
     * Prefetched relationship option sets keyed by target collection slug — the CMSGATE-02 live
     * option source the edit pages load through the bridge's bounded Convex list read
     * (`loadRelationshipOptions`). Must be threaded through THIS prop: `EditorFields` mounts its
     * own `RelationshipQueryProvider`, so a provider wrapped around it from outside is shadowed.
     * A target absent from the map (or an omitted prop) lists zero options — degraded, never
     * crashing.
     */
    relationshipOptions?: Record<string, RelationshipOption[]>;
    /**
     * The live media upload transport (CMSGATE-02) — a server action already bound to the tenant
     * domain. Threaded through THIS prop for the same shadowing reason as `relationshipOptions`:
     * the internal `UploadActionProvider` wins over any outer one. Omitted keeps the degrading
     * placeholder, which surfaces `MissingConvexBridgeError` inline on file pick.
     */
    uploadAction?: EditorFieldsUploadAction;
};

/**
 * Placeholder upload transport for hosts that have not wired the Convex media upload flow. The
 * widget catches the rejection and surfaces it inline, so picking a file degrades to a visible
 * error instead of a crash.
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
 * A host-supplied `extend` pass runs LAST so the admin's nordstar-based widgets
 * override the matching built-ins for the kinds they cover, while every other
 * kind (and bespoke claims like the rich-text `json` widget) survives untouched.
 *
 * @param richText - Whether `json` descriptors render through the rich-text widget.
 * @param extend - Optional host override pass applied after the built-ins.
 * @returns The populated registry.
 */
function buildEditorFieldRegistry(richText: boolean, extend: FieldWidgetExtension | null): FieldRegistry {
    const registry = createFieldRegistry();
    registerScalarFieldWidgets(registry);
    registerCompositeFieldWidgets(registry);
    registerDataBoundFieldWidgets(registry);
    if (richText) registerRichTextFieldWidget(registry);
    extend?.(registry);
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
 * @param props.relationshipOptions - Prefetched relationship options keyed by target slug.
 * @param props.uploadAction - The bound media-upload server action.
 * @returns The rendered descriptor tree.
 */
export function EditorFields({
    collection,
    omitPaths,
    locale,
    defaultLocale,
    relationshipOptions,
    uploadAction,
}: EditorFieldsProps) {
    const schema = editorCollectionSchema(collection);
    const widgetExtension = useFieldWidgetExtension();
    const registry = useMemo(
        () => buildEditorFieldRegistry(schema.richText === true, widgetExtension),
        [schema.richText, widgetExtension],
    );

    const relationshipQuery: RelationshipQuery = useMemo(
        () => (relationTo) => relationshipOptions?.[relationTo] ?? [],
        [relationshipOptions],
    );

    const upload: UploadAction = useMemo(() => {
        if (!uploadAction) return unwiredUploadAction;
        return async (file) => {
            const formData = new FormData();
            formData.set('file', file);
            // The widget collects no metadata yet; the filename is the only alt
            // candidate available at pick time, and `alt` is required on the
            // media contract.
            formData.set('alt', file.name);
            return uploadAction(formData);
        };
    }, [uploadAction]);

    const omit = new Set(omitPaths ?? []);
    const fields = schema.fields.filter((field) => !('name' in field && omit.has(field.name)));

    const resolvedDefault = defaultLocale ?? 'en-US';

    return (
        <FormLocaleProvider locale={locale ?? resolvedDefault} defaultLocale={resolvedDefault}>
            <RelationshipQueryProvider query={relationshipQuery}>
                <UploadActionProvider action={upload}>
                    <RenderFields registry={registry} fields={fields} parentPath="" />
                </UploadActionProvider>
            </RelationshipQueryProvider>
        </FormLocaleProvider>
    );
}

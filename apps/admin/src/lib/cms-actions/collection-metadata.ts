'use server';

import 'server-only';

import type { CollectionMetadatum } from '@nordcom/commerce-cms/types';
import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MetadataStatus = 'draft' | 'published';

/**
 * Subset of the collectionMetadata collection fields that the form can supply.
 *
 * `shopifyHandle` is intentionally excluded — the handle always comes from the
 * URL parameter on create, and update never changes it (the [tenant, handle]
 * unique index would reject such a change). Keeping it out of this type makes
 * the "handle from URL, never from FormData" invariant impossible to violate
 * accidentally.
 *
 * `Partial<>` because fields may be absent in an autosave submission (e.g.
 * draft fires before the user types). Payload validates required fields at
 * publish time — saving an incomplete draft is intentionally permitted.
 */
type CollectionMetadataInput = Pick<CollectionMetadatum, 'descriptionOverride' | 'blocks' | 'seo'>;

// ---------------------------------------------------------------------------
// FormData parsing
// ---------------------------------------------------------------------------

/**
 * Payload's `<Form action={fn}>` serializes the entire form state as a JSON
 * blob in a single FormData key named `_payload` (see
 * `@payloadcms/ui/dist/forms/Form/index.js`, `createFormData` callback).
 * We parse that blob and extract only the fields we expect — never trusting
 * caller-supplied `tenant`, `_status`, or `shopifyHandle` so cross-tenant
 * forgery and handle-swapping attacks are impossible.
 *
 * Two distinct failure modes:
 *   1. No `_payload` key at all → return `{}`. Payload's `<Form>` may emit
 *      an empty submission on initial mount (e.g. autosave debounce fires
 *      before any field is touched). Treating that as a no-op write is
 *      safe because the upsert will still run with `{ tenant, _status }`
 *      and the access layer will reject if something is genuinely wrong.
 *   2. `_payload` value is not parseable JSON → THROW. A malformed payload
 *      means the client is broken or someone is poking the action by hand;
 *      either way, silently writing an empty doc would hide the bug and
 *      potentially blank out the operator's real data.
 */
function parseFormData(formData: FormData): Partial<CollectionMetadataInput> {
    const raw = formData.get('_payload');
    if (!raw || typeof raw !== 'string') {
        // Empty submission — no _payload key. See case (1) above.
        return {};
    }

    let parsed: Record<string, unknown>;
    try {
        parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch (err) {
        // Malformed _payload — see case (2) above. Throw so Payload's
        // <Form> surfaces the failure to the operator instead of writing
        // an empty doc.
        console.error('[collection-metadata] Failed to parse _payload JSON', err);
        throw new Error('Malformed form payload');
    }

    return {
        // `descriptionOverride` is a richText field using Lexical editor.
        // The serialized form is a `SerializedEditorState`-like JSON object.
        // Treat as opaque; Payload validates the shape at write time.
        descriptionOverride:
            parsed.descriptionOverride != null && typeof parsed.descriptionOverride === 'object'
                ? (parsed.descriptionOverride as CollectionMetadataInput['descriptionOverride'])
                : undefined,
        // `blocks` is a Payload "blocks" type — variable schema per block
        // variant. Treat as opaque; Payload validates the nested structure.
        blocks: Array.isArray(parsed.blocks) ? (parsed.blocks as CollectionMetadataInput['blocks']) : undefined,
        // `seo` is a localized group with text/upload/checkbox sub-fields.
        // Treat as opaque — Payload validates the shape at write time.
        seo:
            parsed.seo != null && typeof parsed.seo === 'object'
                ? (parsed.seo as CollectionMetadataInput['seo'])
                : undefined,
    };
}

// ---------------------------------------------------------------------------
// Shared upsert helper (not exported)
// ---------------------------------------------------------------------------

/**
 * Upserts a collectionMetadata doc keyed by (tenant, handle).
 *
 * - If a doc already exists for this (tenant, handle) pair, it is updated.
 * - If no doc exists, a new one is created with `shopifyHandle` from the URL
 *   parameter — never from FormData (defense against handle-swapping attacks).
 *
 * Race condition: two concurrent clicks could attempt to create the same
 * (tenant, handle) pair. Payload's unique index on [tenant, shopifyHandle]
 * will reject the second write with a duplicate-key error. Single-user editing
 * makes this extremely unlikely in practice.
 */
async function upsert(domain: string, handle: string, formData: FormData, status: MetadataStatus): Promise<void> {
    // Parse BEFORE auth — malformed payloads should fail fast without
    // doing the (relatively expensive) auth roundtrip.
    const parsed = parseFormData(formData);

    const { payload, user, tenant } = await getAuthedPayloadCtx(domain);

    if (!tenant) {
        console.error('[collection-metadata] upsert called without a resolved tenant');
        notFound();
    }

    // Find existing doc by (tenant, handle). This is the authoritative lookup —
    // we never trust a doc id from the client.
    const { docs } = await payload.find({
        collection: 'collectionMetadata',
        where: {
            and: [{ tenant: { equals: tenant.id } }, { shopifyHandle: { equals: handle } }],
        },
        limit: 1,
        user,
        overrideAccess: false,
    });

    const existing = docs[0];

    if (existing) {
        // Update existing doc. Do NOT spread `shopifyHandle` into the update
        // data — Payload's unique index would reject a handle change, and more
        // importantly, the handle is the doc's identity key. It must only come
        // from the URL, never from user-editable form state.
        await payload.update({
            collection: 'collectionMetadata',
            id: existing.id,
            data: { ...parsed, _status: status } as never,
            user,
            overrideAccess: false,
        });
    } else {
        // Create new doc. `shopifyHandle` comes from the URL parameter — the
        // parsed FormData never contains it, so this is the only code path
        // that can set it, and it's always set to the URL value.
        await payload.create({
            collection: 'collectionMetadata',
            data: {
                ...parsed,
                shopifyHandle: handle,
                tenant: tenant.id,
                _status: status,
            } as never,
            user,
            overrideAccess: false,
        });
    }

    // Trailing slash matches trailingSlash: true in next.config.js.
    revalidatePath(`/${domain}/content/collection-metadata/`);
    revalidatePath(`/${domain}/content/collection-metadata/${handle}/`);
}

// ---------------------------------------------------------------------------
// Exported server actions
// ---------------------------------------------------------------------------

/**
 * Saves the collection metadata doc as a draft (create or update).
 *
 * `domain` and `handle` are bound positional args from RSC:
 * `saveCollectionMetadataDraftAction.bind(null, domain, handle)`.
 * The client component calls `saveDraftAction(formData)` after binding.
 */
export async function saveCollectionMetadataDraftAction(
    domain: string,
    handle: string,
    formData: FormData,
): Promise<void> {
    return upsert(domain, handle, formData, 'draft');
}

/**
 * Publishes the collection metadata doc (create or update).
 * Same signature as `saveCollectionMetadataDraftAction`.
 */
export async function publishCollectionMetadataAction(
    domain: string,
    handle: string,
    formData: FormData,
): Promise<void> {
    return upsert(domain, handle, formData, 'published');
}

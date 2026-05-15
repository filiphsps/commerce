'use server';

import 'server-only';

import type { Page } from '@nordcom/commerce-cms/types';
import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PageStatus = 'draft' | 'published';

/**
 * Subset of the pages collection fields that the form can supply.
 *
 * Derived from the canonical `Page` Payload-generated type. The `Pick` is
 * intentional — adding a field to the collection without listing it here
 * would silently drop user input. If a field is renamed or removed upstream,
 * this `Pick` breaks at compile time, forcing the action to be updated in
 * lockstep.
 *
 * `Partial<>` because title/slug are required on the Page model but may be
 * absent in an autosave submission (e.g. draft fires before the user types).
 * Payload validates required fields at publish time — saving an incomplete
 * draft is intentionally permitted.
 */
type PageInput = Pick<Page, 'title' | 'slug' | 'blocks' | 'seo'>;

// ---------------------------------------------------------------------------
// FormData parsing
// ---------------------------------------------------------------------------

/**
 * Payload's `<Form action={fn}>` serializes the entire form state as a JSON
 * blob in a single FormData key named `_payload` (see
 * `@payloadcms/ui/dist/forms/Form/index.js`, `createFormData` callback).
 * We parse that blob and extract only the fields we expect — never trusting
 * caller-supplied `tenant` or `_status` so cross-tenant forgery is impossible.
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
function parseFormData(formData: FormData): Partial<PageInput> {
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
        console.error('[pages] Failed to parse _payload JSON', err);
        throw new Error('Malformed form payload');
    }

    return {
        title: typeof parsed.title === 'string' ? parsed.title : undefined,
        slug: typeof parsed.slug === 'string' ? parsed.slug : undefined,
        // `blocks` is a Payload "blocks" type — variable schema per block
        // variant. Treat as opaque; Payload validates the nested structure and
        // the access layer enforces tenant ownership.
        blocks: Array.isArray(parsed.blocks) ? (parsed.blocks as PageInput['blocks']) : undefined,
        // `seo` is a localized group with text/upload/checkbox sub-fields.
        // Treat as opaque — Payload validates the shape at write time.
        seo: parsed.seo != null && typeof parsed.seo === 'object' ? (parsed.seo as PageInput['seo']) : undefined,
    };
}

// ---------------------------------------------------------------------------
// Shared upsert helper for existing-doc save/publish (not exported)
// ---------------------------------------------------------------------------

async function upsert(domain: string, id: string, formData: FormData, status: PageStatus): Promise<void> {
    // Parse BEFORE auth — malformed payloads should fail fast without
    // doing the (relatively expensive) auth roundtrip.
    const parsed = parseFormData(formData);

    const { payload, user, tenant } = await getAuthedPayloadCtx(domain);

    if (!tenant) {
        console.error('[pages] upsert called without a resolved tenant');
        throw new Error('Tenant context is required for page actions');
    }

    // Fetch the existing doc to verify tenant ownership. `findByID` with
    // `overrideAccess: false` enforces the tenantScopedRead access predicate,
    // but we add an explicit tenant-match check for defense-in-depth: an
    // id-guessing attacker who somehow passes the access layer still can't
    // write to another tenant's doc.
    const existing = await payload.findByID({
        collection: 'pages',
        id,
        user,
        overrideAccess: false,
        draft: true,
    });

    // `existing.tenant` may be a populated object or a bare id string,
    // depending on depth. Normalise to string for comparison.
    const docTenantId =
        existing.tenant != null && typeof existing.tenant === 'object' && 'id' in existing.tenant
            ? String((existing.tenant as { id: unknown }).id)
            : String(existing.tenant ?? '');

    if (docTenantId !== String(tenant.id)) {
        // Cross-tenant id-forgery attempt — treat as not-found rather than
        // forbidden to avoid leaking that the id exists on another tenant.
        notFound();
    }

    await payload.update({
        collection: 'pages',
        id,
        // Cast to `never` — the form may submit a partial payload (autosave
        // before required fields are filled). Payload validates at publish time;
        // the cast avoids requiring a complete document on every draft save.
        data: { ...parsed, _status: status } as never,
        user,
        overrideAccess: false,
    });

    // Trailing slash matches trailingSlash: true in next.config.js.
    revalidatePath(`/${domain}/content/pages/`);
    revalidatePath(`/${domain}/content/pages/${id}/`);
}

// ---------------------------------------------------------------------------
// Exported server actions
// ---------------------------------------------------------------------------

/**
 * Creates a new page doc and returns its id so the caller can redirect to
 * `/[domain]/content/pages/[id]/`.
 *
 * Called from the `/pages/new/` route — there is no existing doc, so we
 * skip `findByID` and go straight to `payload.create`.
 */
export async function createPageAction(domain: string, formData: FormData): Promise<{ id: string }> {
    const parsed = parseFormData(formData);

    const { payload, user, tenant } = await getAuthedPayloadCtx(domain);

    if (!tenant) {
        notFound();
    }

    if (!parsed.title || !parsed.slug) {
        throw new Error('Title and slug are required to create a page.');
    }

    const created = await payload.create({
        collection: 'pages',
        data: { ...parsed, tenant: tenant.id, _status: 'draft' } as never,
        user,
        overrideAccess: false,
    });

    revalidatePath(`/${domain}/content/pages/`);
    return { id: String(created.id) };
}

/**
 * Saves the page as a draft. Domain and id are bound positional args from RSC;
 * the client component calls `saveDraftAction(formData)`.
 */
export async function savePageDraftAction(domain: string, id: string, formData: FormData): Promise<void> {
    return upsert(domain, id, formData, 'draft');
}

/**
 * Publishes the page. Same signature as `savePageDraftAction`.
 */
export async function publishPageAction(domain: string, id: string, formData: FormData): Promise<void> {
    return upsert(domain, id, formData, 'published');
}

/**
 * Deletes a single page. Admin-only — editors cannot delete pages per the
 * collection's `delete: adminOnly` access predicate.
 */
export async function deletePageAction(domain: string, id: string): Promise<void> {
    const { payload, user } = await getAuthedPayloadCtx(domain);

    // Explicit role check before calling Payload so the error surface is
    // consistent (notFound rather than a Payload access-control exception).
    if (user.role !== 'admin') {
        notFound();
    }

    await payload.delete({ collection: 'pages', id, user, overrideAccess: false });
    revalidatePath(`/${domain}/content/pages/`);
}

/**
 * Bulk-deletes pages identified by `ids`. Admin-only.
 *
 * Uses `payload.delete` with a `where: { id: { in: ids } }` filter, which
 * Payload's local API supports via the `ManyOptions` overload confirmed in
 * `payload/dist/collections/operations/local/delete.d.ts`.
 *
 * BulkActions calls the bound function as `bulkDeletePagesAction(ids: string[])`,
 * so `.bind(null, domain)` in the RSC produces the correct `(ids) => Promise<void>`
 * signature.
 */
export async function bulkDeletePagesAction(domain: string, ids: string[]): Promise<void> {
    const { payload, user } = await getAuthedPayloadCtx(domain);

    if (user.role !== 'admin') {
        notFound();
    }

    await payload.delete({
        collection: 'pages',
        where: { id: { in: ids } },
        user,
        overrideAccess: false,
    });

    revalidatePath(`/${domain}/content/pages/`);
}

/**
 * Bulk-publishes pages identified by `ids`.
 *
 * Loops because Payload's local API doesn't have a bulk-update-with-status
 * operation. The loop is acceptable here: bulk actions are admin-triggered
 * and the page count is bounded by the list view limit (100).
 *
 * Partial-failure semantics: if one update fails (e.g. a stale doc lock,
 * validation error on a specific page), the loop continues and collects the
 * failures. After all ids have been attempted, the list path is revalidated
 * unconditionally (so any successful updates are reflected in the UI) and a
 * single aggregated error is thrown reporting the failed ids. This gives the
 * operator full visibility into which pages succeeded and which need retry —
 * if we re-threw on first failure, the remaining pages would never be
 * attempted and the user would have no way to tell what state things ended in.
 */
export async function bulkPublishPagesAction(domain: string, ids: string[]): Promise<void> {
    const { payload, user } = await getAuthedPayloadCtx(domain);

    const errors: Array<{ id: string; error: unknown }> = [];
    for (const id of ids) {
        try {
            await payload.update({
                collection: 'pages',
                id,
                data: { _status: 'published' } as never,
                user,
                overrideAccess: false,
            });
        } catch (err) {
            console.error(`[pages] bulkPublish failed for ${id}`, err);
            errors.push({ id, error: err });
        }
    }

    // Revalidate unconditionally so any updates that DID succeed are visible
    // in the list view even when other updates failed.
    revalidatePath(`/${domain}/content/pages/`);

    if (errors.length > 0) {
        const failedIds = errors.map((e) => e.id).join(', ');
        throw new Error(`Bulk publish failed for ${errors.length}/${ids.length} page(s): ${failedIds}`);
    }
}

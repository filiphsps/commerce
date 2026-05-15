'use server';

import 'server-only';

import type { Header } from '@nordcom/commerce-cms/types';
import { revalidatePath } from 'next/cache';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HeaderStatus = 'draft' | 'published';

/**
 * Subset of the header collection fields that the form can supply.
 *
 * Derived from the canonical `Header` Payload-generated type. The `Pick` is
 * intentional — adding a field to the collection without listing it here
 * would silently drop user input. If a field is renamed or removed upstream,
 * this `Pick` breaks at compile time, forcing the action to be updated in
 * lockstep.
 */
type HeaderInput = Pick<Header, 'logo' | 'logoLink' | 'items' | 'localeSwitcher' | 'cta'>;

// ---------------------------------------------------------------------------
// FormData parsing
// ---------------------------------------------------------------------------

/**
 * Payload's `<Form action={fn}>` serializes the entire form state as a JSON
 * blob in a single FormData key named `_payload` (see
 * `@payloadcms/ui/dist/forms/Form/index.js`, `createFormData` callback).
 * We parse that blob and extract only the fields we expect — never trusting
 * caller-supplied `tenant` so cross-tenant forgery is impossible.
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
function parseFormData(formData: FormData): Partial<HeaderInput> {
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
        console.error('[header] Failed to parse _payload JSON', err);
        throw new Error('Malformed form payload');
    }

    return {
        logo: parsed.logo != null ? (parsed.logo as HeaderInput['logo']) : undefined,
        logoLink: typeof parsed.logoLink === 'string' ? parsed.logoLink : undefined,
        // `items` is a recursive nav array — treat as opaque. Payload's
        // create/update validates the array structure and the access layer
        // enforces tenant ownership. The allowlist intentionally excludes
        // `tenant` to prevent cross-tenant forgery.
        items: Array.isArray(parsed.items) ? (parsed.items as HeaderInput['items']) : undefined,
        localeSwitcher:
            parsed.localeSwitcher != null && typeof parsed.localeSwitcher === 'object'
                ? (parsed.localeSwitcher as HeaderInput['localeSwitcher'])
                : undefined,
        // `cta` is a localized link group — treat as opaque. Payload validates
        // the shape; the locale written is determined by req.locale from ctx.
        cta: parsed.cta != null && typeof parsed.cta === 'object' ? (parsed.cta as HeaderInput['cta']) : undefined,
    };
}

// ---------------------------------------------------------------------------
// Shared upsert helper (not exported)
// ---------------------------------------------------------------------------

async function upsert(domain: string, formData: FormData, status: HeaderStatus): Promise<void> {
    // Parse BEFORE auth — malformed payloads should fail fast without
    // doing the (relatively expensive) auth roundtrip. The thrown error
    // surfaces to Payload's <Form> as a generic submission error.
    const parsed = parseFormData(formData);

    const { payload, user, tenant } = await getAuthedPayloadCtx(domain);

    // `getAuthedPayloadCtx(domain)` always resolves a non-null tenant when
    // domain is provided — it calls notFound() otherwise. The type says
    // nullable to support the cross-tenant admin case (no domain), but for
    // all server actions below domain is required, so we guard defensively.
    if (!tenant) {
        console.error('[header] upsert called without a resolved tenant');
        throw new Error('Tenant context is required for header actions');
    }

    const { docs } = await payload.find({
        collection: 'header',
        where: { tenant: { equals: tenant.id } },
        limit: 1,
        user,
        overrideAccess: false,
    });

    const existing = docs[0];

    if (existing) {
        await payload.update({
            collection: 'header',
            id: existing.id as string,
            // Cast to `never` — Payload's strict typegen requires `cta` (a
            // required field) to be present but the form may submit a partial
            // payload (autosave on first load, empty fields). Payload's own
            // validation and access layer enforce correctness at runtime; the
            // cast avoids requiring a complete header document on every draft save.
            data: { ...parsed, _status: status } as never,
            user,
            overrideAccess: false,
        });
    } else {
        await payload.create({
            collection: 'header',
            data: { ...parsed, tenant: tenant.id, _status: status } as never,
            user,
            overrideAccess: false,
        });
    }

    // Trailing slash matters — `apps/admin/next.config.js` sets
    // `trailingSlash: true`, so the canonical path that the router
    // mounts (and that `cacheComponents` keys against) ends in `/`.
    // Without it, this `revalidatePath` no-ops and the admin UI shows
    // stale data after save/publish.
    revalidatePath(`/${domain}/content/header/`);
}

// ---------------------------------------------------------------------------
// Exported server actions
// ---------------------------------------------------------------------------

export async function saveHeaderDraftAction(domain: string, formData: FormData): Promise<void> {
    await upsert(domain, formData, 'draft');
}

export async function publishHeaderAction(domain: string, formData: FormData): Promise<void> {
    await upsert(domain, formData, 'published');
}

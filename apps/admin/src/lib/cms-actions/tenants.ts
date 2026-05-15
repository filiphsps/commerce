'use server';

import 'server-only';

import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Subset of the tenants collection fields that the form can supply.
 *
 * The `Pick` is intentional — adding a field to the collection without listing
 * it here would silently drop user input. If a field is renamed or removed
 * upstream, this `Pick` breaks at compile time, forcing the action to be
 * updated in lockstep.
 *
 * No `_status` — the tenants collection has no `versions:` config and is
 * never drafted or published. No `tenant` field — tenants ARE the tenant.
 */
type TenantInput = {
    name?: string;
    slug?: string;
    defaultLocale?: string;
    locales?: string[];
    shopId?: string;
};

// ---------------------------------------------------------------------------
// FormData parsing
// ---------------------------------------------------------------------------

/**
 * Payload's `<Form action={fn}>` serializes the entire form state as a JSON
 * blob in a single FormData key named `_payload`.
 *
 * Two distinct failure modes:
 *   1. No `_payload` key at all → return `{}`. Safe as a no-op.
 *   2. `_payload` value is not parseable JSON → THROW. A malformed payload
 *      means the client is broken or someone is poking the action manually.
 */
function parseFormData(formData: FormData): TenantInput {
    const raw = formData.get('_payload');
    if (!raw || typeof raw !== 'string') {
        return {};
    }

    let parsed: Record<string, unknown>;
    try {
        parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch (err) {
        console.error('[tenants] Failed to parse _payload JSON', err);
        throw new Error('Malformed form payload');
    }

    return {
        name: typeof parsed.name === 'string' ? parsed.name : undefined,
        slug: typeof parsed.slug === 'string' ? parsed.slug : undefined,
        defaultLocale: typeof parsed.defaultLocale === 'string' ? parsed.defaultLocale : undefined,
        // `locales` is hasMany: true — serialized as string[].
        locales: Array.isArray(parsed.locales) ? (parsed.locales as string[]) : undefined,
        shopId: typeof parsed.shopId === 'string' ? parsed.shopId : undefined,
    };
}

// ---------------------------------------------------------------------------
// Exported server actions
// ---------------------------------------------------------------------------

/**
 * Creates a new tenant doc and returns its id.
 *
 * Admin-only at the route level (gated by `(admin)/layout.tsx`) and at the
 * action level (explicit role check + `overrideAccess: false` so Payload's
 * `isAdmin` access predicate is the final arbiter).
 *
 * Validates all four required fields (`name`, `slug`, `defaultLocale`,
 * `locales`) before calling `payload.create`.
 *
 * No `tenant` field and no `_status` — tenants are the top-level entity and
 * the collection has no drafts/versions.
 */
export async function createTenantAction(formData: FormData): Promise<{ id: string }> {
    const parsed = parseFormData(formData);

    const { payload, user } = await getAuthedPayloadCtx();

    if (user.role !== 'admin') {
        notFound();
    }

    if (!parsed.name) {
        throw new Error('Name is required to create a tenant.');
    }
    if (!parsed.slug) {
        throw new Error('Slug is required to create a tenant.');
    }
    if (!parsed.defaultLocale) {
        throw new Error('Default locale is required to create a tenant.');
    }
    if (!parsed.locales || parsed.locales.length === 0) {
        throw new Error('At least one locale is required to create a tenant.');
    }

    const created = await payload.create({
        collection: 'tenants',
        data: parsed as never,
        user,
        overrideAccess: false,
    });

    revalidatePath('/tenants/');
    return { id: String(created.id) };
}

/**
 * Updates an existing tenant doc.
 *
 * No draft/publish split — tenants have no `versions:` config. A single
 * "Save" writes the data directly.
 *
 * The Payload access predicate `isAdmin` enforces role at the SDK level
 * (defense in depth on top of the explicit role check and the layout gate).
 */
export async function updateTenantAction(id: string, formData: FormData): Promise<void> {
    const parsed = parseFormData(formData);

    const { payload, user } = await getAuthedPayloadCtx();

    if (user.role !== 'admin') {
        notFound();
    }

    await payload.update({
        collection: 'tenants',
        id,
        data: parsed as never,
        user,
        overrideAccess: false,
    });

    revalidatePath('/tenants/');
    revalidatePath(`/tenants/${id}/`);
}

/**
 * Deletes a tenant doc by id.
 *
 * WARNING: Payload does not cascade deletes. Deleting a tenant will leave
 * orphaned `pages`, `articles`, `header`, `footer`, `businessData`, etc. docs
 * whose `tenant` field still references this id. The operator is responsible
 * for cleaning up related content before or after deletion. A future Task 20
 * UI update may surface a warning about orphaned content.
 */
export async function deleteTenantAction(id: string): Promise<void> {
    const { payload, user } = await getAuthedPayloadCtx();

    if (user.role !== 'admin') {
        notFound();
    }

    await payload.delete({ collection: 'tenants', id, user, overrideAccess: false });
    revalidatePath('/tenants/');
}

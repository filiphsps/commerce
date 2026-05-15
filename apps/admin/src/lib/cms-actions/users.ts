'use server';

import 'server-only';

import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Subset of the users collection fields that the form can supply.
 *
 * The allowlist is intentional — adding a field to the collection without
 * listing it here would silently drop user input. If a field is renamed or
 * removed upstream, this type breaks at compile time.
 *
 * No `_status` — the users collection has no `versions:` config.
 * No `password` — Payload owns auth state; create passes a throwaway UUID.
 * `tenants` is added by the multi-tenant plugin as Array<{ tenant: string }>.
 */
type UserInput = {
    email?: string;
    role?: string;
    tenants?: Array<{ tenant: string }>;
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
function parseFormData(formData: FormData): UserInput {
    const raw = formData.get('_payload');
    if (!raw || typeof raw !== 'string') {
        return {};
    }

    let parsed: Record<string, unknown>;
    try {
        parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch (err) {
        console.error('[users] Failed to parse _payload JSON', err);
        throw new Error('Malformed form payload');
    }

    // `tenants` is Array<{ tenant: string }> from the multi-tenant plugin.
    // Sanitize: only include if it's an array of objects with a string `tenant`
    // field. Non-array or arrays of non-objects are dropped rather than
    // forwarded to Payload where they'd cause a cryptic schema error.
    let tenants: Array<{ tenant: string }> | undefined;
    if (Array.isArray(parsed.tenants)) {
        tenants = (parsed.tenants as unknown[])
            .filter((item): item is { tenant: string } => {
                return typeof item === 'object' && item !== null && 'tenant' in item && typeof (item as Record<string, unknown>).tenant === 'string';
            });
    }

    return {
        email: typeof parsed.email === 'string' ? parsed.email : undefined,
        role: typeof parsed.role === 'string' ? parsed.role : undefined,
        tenants,
    };
}

// ---------------------------------------------------------------------------
// Exported server actions
// ---------------------------------------------------------------------------

/**
 * Creates a new user doc and returns its id.
 *
 * Admin-only at the route level (gated by `(admin)/layout.tsx`) and at the
 * action level (explicit role check + `overrideAccess: false`).
 *
 * Password: this codebase uses NextAuth as the primary auth strategy (the
 * "bridge" pattern). Payload expects `data.password` when `auth: {...}` is
 * configured and `disableLocalStrategy` is not fully off. We follow the same
 * pattern as `findOrCreateUser` in `payload.config.ts` (lines 111-148): pass
 * `crypto.randomUUID()` as a throwaway value — real auth happens via NextAuth
 * and this password is never used.
 */
export async function createUserAction(formData: FormData): Promise<{ id: string }> {
    const { payload, user } = await getAuthedPayloadCtx();

    if (user.role !== 'admin') {
        notFound();
    }

    const parsed = parseFormData(formData);

    if (!parsed.email) {
        throw new Error('Email is required to create a user.');
    }
    if (!parsed.role) {
        throw new Error('Role is required to create a user.');
    }

    const created = await payload.create({
        collection: 'users',
        data: {
            email: parsed.email,
            role: parsed.role,
            tenants: parsed.tenants ?? [],
            // Throwaway password — real auth is via NextAuth (bridge pattern).
            // Payload requires a password field when `auth: {...}` is configured
            // and local strategy is not fully disabled. See findOrCreateUser in
            // payload.config.ts for the established precedent.
            password: crypto.randomUUID(),
        } as never,
        user,
        overrideAccess: false,
    });

    revalidatePath('/users/');
    return { id: String(created.id) };
}

/**
 * Updates an existing user doc.
 *
 * Admin-only. Editors cannot update other users via this action (the schema's
 * `update` access function allows self-edit, but this UI is admin-only;
 * self-edit via `/profile/` is out of scope for this CRUD).
 *
 * Self-demotion guard: prevents an admin from accidentally revoking their own
 * admin role via the UI, which would immediately lock them out. The lockout
 * would be permanent if they are the only admin.
 */
export async function updateUserAction(id: string, formData: FormData): Promise<void> {
    const { payload, user } = await getAuthedPayloadCtx();

    if (user.role !== 'admin') {
        notFound();
    }

    const parsed = parseFormData(formData);

    // Prevent self-demotion: if the admin is editing their own doc and trying
    // to set role to anything other than 'admin' (including 'editor', the
    // empty string, or any future role), reject. This would lock them out
    // immediately, and if they're the only admin it would be permanent.
    // Checking `!== 'admin'` is stricter than `=== 'editor'`: it rejects any
    // role change away from admin regardless of the submitted value, so the
    // error surfaces here instead of being deferred to Payload schema
    // validation with a less helpful message.
    if (id === user.id && parsed.role !== undefined && parsed.role !== 'admin') {
        throw new Error('Admins cannot demote themselves.');
    }

    await payload.update({
        collection: 'users',
        id,
        data: parsed as never,
        user,
        overrideAccess: false,
    });

    revalidatePath('/users/');
    revalidatePath(`/users/${id}/`);
}

/**
 * Deletes a user doc by id.
 *
 * Admin-only. Self-delete is blocked: deleting yourself as an admin would be
 * an immediate lockout. If you are the only admin, it would be permanent with
 * no recovery path through this UI.
 */
export async function deleteUserAction(id: string): Promise<void> {
    const { payload, user } = await getAuthedPayloadCtx();

    if (user.role !== 'admin') {
        notFound();
    }

    // Prevent self-delete: an admin deleting their own account would cause an
    // immediate lockout. If they are the sole admin this is unrecoverable via
    // the UI.
    if (id === user.id) {
        throw new Error('Admins cannot delete themselves.');
    }

    await payload.delete({ collection: 'users', id, user, overrideAccess: false });
    revalidatePath('/users/');
}

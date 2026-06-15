'use server';

import 'server-only';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { type AccountSelf, updateOwnAccount } from '@/lib/account-convex';
import { THEME_COOKIE, type ThemePreference } from '@/utils/theme';

/** A discriminated result the client forms branch on for toast feedback. */
export type AccountActionResult<T> = { ok: true; account: T } | { ok: false; error: string };

/**
 * Extracts a human-readable message from an unknown thrown value, preferring a Convex error payload's
 * `message` when present.
 *
 * @param error - The caught value.
 * @returns The message to surface.
 */
function messageOf(error: unknown): string {
    if (error && typeof error === 'object' && 'data' in error) {
        const data = (error as { data?: unknown }).data;
        if (
            data &&
            typeof data === 'object' &&
            'message' in data &&
            typeof (data as { message?: unknown }).message === 'string'
        ) {
            return (data as { message: string }).message;
        }
    }
    return error instanceof Error ? error.message : 'Something went wrong.';
}

/**
 * Persists the operator's display name. Trims the input, delegates validation to the Convex seam
 * (which is the source of truth), revalidates the account route, and returns a result the form
 * surfaces as a toast.
 *
 * @param name - The new display name (untrimmed).
 * @returns Success with the fresh account, or failure with a message.
 */
export async function saveAccountName(name: string): Promise<AccountActionResult<AccountSelf>> {
    try {
        const account = await updateOwnAccount({ name: name.trim() });
        revalidatePath('/accounts/');
        return { ok: true, account };
    } catch (error) {
        return { ok: false, error: messageOf(error) };
    }
}

/**
 * Persists the operator's theme preference, mirrors it to the `admin-theme` cookie (so SSR paints the
 * right theme without a flash), and revalidates the layout. The client provider has already applied
 * the change optimistically; this makes it durable + cross-device.
 *
 * @param theme - The chosen preference.
 * @returns Success, or failure with a message (the toggle reverts on failure).
 */
export async function saveThemePreference(
    theme: ThemePreference,
): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
        await updateOwnAccount({ theme });
        const cookieStore = await cookies();
        cookieStore.set(THEME_COOKIE, theme, { path: '/', maxAge: 31_536_000, sameSite: 'lax' });
        revalidatePath('/', 'layout');
        return { ok: true };
    } catch (error) {
        return { ok: false, error: messageOf(error) };
    }
}

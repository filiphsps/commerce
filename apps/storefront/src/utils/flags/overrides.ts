import 'server-only';

import { decryptOverrides } from 'flags';
import { cookies } from 'next/headers';
import { cache } from 'react';

export type FlagOverrides = Record<string, unknown>;

/**
 * Reads and decrypts the Vercel Flags toolbar override cookie for the current request.
 *
 * @returns The decrypted override map, or `null` when the `vercel-flag-overrides` cookie is absent or `FLAGS_SECRET` is not configured.
 */
export const getFlagOverrides = cache(async (): Promise<FlagOverrides | null> => {
    if (!process.env.FLAGS_SECRET) return null;
    const c = await cookies();
    const cookie = c.get('vercel-flag-overrides')?.value;
    if (!cookie) return null;
    try {
        return (await decryptOverrides(cookie, process.env.FLAGS_SECRET)) as FlagOverrides;
    } catch {
        return null;
    }
});

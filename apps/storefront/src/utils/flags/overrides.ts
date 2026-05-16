import 'server-only';

import { decryptOverrides } from 'flags';
import { cookies } from 'next/headers';
import { cache } from 'react';

export type FlagOverrides = Record<string, unknown>;

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

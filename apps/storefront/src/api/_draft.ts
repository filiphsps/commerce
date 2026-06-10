import 'server-only';

import { draftMode } from 'next/headers';
import { unstable_rethrow } from 'next/navigation';

/**
 * Whether the current request carries the CMS preview/draft cookie toggled by
 * `app/[domain]/api/cms-preview/route.ts`.
 *
 * Safe to call from the CMS getters even though they run inside `'use cache'`
 * boundaries: `draftMode().isEnabled` is the one request API Cache Components
 * permits in cached scopes, and an enabled draft mode bypasses every cache
 * entry for the request — so a draft render can never be baked into (or served
 * from) the published cache. Outside a request scope (unit tests, scripts) the
 * read throws; that degrades to `false` so the getters keep their
 * published-only default, while Next's own control-flow errors are rethrown
 * untouched.
 *
 * @returns `true` when draft mode is enabled for the current request.
 */
export async function isDraftModeEnabled(): Promise<boolean> {
    try {
        return (await draftMode()).isEnabled;
    } catch (error: unknown) {
        unstable_rethrow(error);
        return false;
    }
}

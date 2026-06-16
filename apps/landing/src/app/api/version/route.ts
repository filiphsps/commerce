import { connection } from 'next/server';
import { createVersionRoute } from 'next-build-notifier/server';

const route = createVersionRoute();

/**
 * Build-version endpoint. `connection()` opts into per-request rendering because `force-dynamic` is
 * incompatible with `cacheComponents: true` in this app's Next config. The endpoint always reflects
 * the live deployment id; `createVersionRoute` also sets `Cache-Control: no-store` to prevent
 * CDN and browser caching.
 *
 * @returns A JSON response containing the current build id.
 */
export async function GET(): Promise<Response> {
    await connection();
    return route.GET();
}

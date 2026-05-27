import 'server-only';
import type { Payload } from 'payload';
import { getPayload } from 'payload';
import { buildPayloadConfig } from '../config';

let cached: Promise<Payload> | undefined;

/**
 * Returns the module-level singleton Payload instance, booting it on the first
 * call. Subsequent calls return the same promise so Payload's internal
 * connection pool is reused across concurrent server requests.
 *
 * Boots without an admin UI (`includeAdmin: false`) — this instance is used
 * only for data access from storefront Server Components, not from the admin
 * shell.
 *
 * @returns A promise that resolves to the initialized Payload instance.
 *
 * @example
 *   const payload = await getPayloadInstance();
 */
export const getPayloadInstance = (): Promise<Payload> => {
    if (cached) return cached;
    cached = (async () => {
        const config = await buildPayloadConfig({
            secret: process.env.PAYLOAD_SECRET ?? '',
            mongoUrl: process.env.MONGODB_URI ?? '',
            includeAdmin: false,
            enableStorage: true,
        });
        return getPayload({ config });
    })();
    return cached;
};

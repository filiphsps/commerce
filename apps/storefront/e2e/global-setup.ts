import { type StartedMongo, seedCanonical, startMongo } from '@nordcom/commerce-test-mongo';
import mongoose from 'mongoose';

let handle: StartedMongo | null = null;

/**
 * Playwright globalSetup: boots an in-process MongoDB, seeds the canonical
 * demo tenant, and exposes the resulting URI + tenant id to the test workers
 * via `MONGODB_URI` and `E2E_TENANT_ID`.
 *
 * Per-spec CMS resets in `fixtures/seed-cms.ts` read both env vars; if either
 * is missing we surface a loud error rather than letting Payload silently
 * connect to a stale instance.
 *
 * @returns Resolves once the seed completes.
 * @throws If the demo shop document cannot be found after `seedCanonical`.
 */
export default async function globalSetup(): Promise<void> {
    const started = await startMongo();
    process.env.MONGODB_URI = started.uri;
    process.env.PAYLOAD_SECRET = process.env.PAYLOAD_SECRET ?? 'development-secret';
    handle = started;
    await seedCanonical(started.uri);

    const conn = await mongoose.createConnection(started.uri, { bufferCommands: false }).asPromise();
    try {
        const shop = await conn.collection('shops').findOne({ domain: 'nordcom-demo-shop.com' });
        if (!shop) throw new Error('[global-setup] expected the demo shop after seedCanonical');
        process.env.E2E_TENANT_ID = String(shop._id);
    } finally {
        await conn.close();
    }

    console.info(`[global-setup] MONGODB_URI=${started.uri} E2E_TENANT_ID=${process.env.E2E_TENANT_ID}`);
}

/**
 * Playwright globalTeardown: stops the in-process MongoDB started by
 * `globalSetup`. Safe to call when `startMongo` was never reached.
 *
 * @returns Resolves once mongod has shut down.
 */
export async function globalTeardown(): Promise<void> {
    await handle?.stop();
}

import { register } from 'node:module';

import { seedCanonical } from '@nordcom/commerce-test-mongo';
import mongoose from 'mongoose';

// Seed-time only: stub `next/cache` for Payload's afterChange hooks. Can't
// widen the `--import` loader to do this because webServer inherits
// NODE_OPTIONS and stubbing `next/cache` would break real Next runtime caching.
register('@nordcom/commerce-test-mongo/seed-loader', import.meta.url);

/**
 * Playwright globalSetup: re-seeds the canonical demo tenant against the
 * daemon mongo (booted by root `pretest:e2e` and exposed via MONGODB_URI)
 * and exports `E2E_TENANT_ID` for test workers.
 *
 * Uses the existing MONGODB_URI rather than starting its own mongo so that
 * the webServer (which Playwright starts BEFORE globalSetup, reading the
 * URI from `.env.local`) and the seed write to the same instance.
 *
 * @returns Resolves once the seed completes.
 * @throws If `MONGODB_URI` is unset, or the demo shop document cannot be
 *         found after `seedCanonical`.
 */
export default async function globalSetup(): Promise<void> {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('[global-setup] MONGODB_URI must be set — run via `pnpm test:e2e`');
    }
    process.env.PAYLOAD_SECRET = process.env.PAYLOAD_SECRET ?? 'development-secret';
    await seedCanonical(uri);

    const conn = await mongoose.createConnection(uri, { bufferCommands: false }).asPromise();
    try {
        const shop = await conn.collection('shops').findOne({ domain: 'nordcom-demo-shop.com' });
        if (!shop) throw new Error('[global-setup] expected the demo shop after seedCanonical');
        process.env.E2E_TENANT_ID = String(shop._id);
    } finally {
        await conn.close();
    }

    console.info(`[global-setup] MONGODB_URI=${uri} E2E_TENANT_ID=${process.env.E2E_TENANT_ID}`);
}

/**
 * Playwright globalTeardown: no-op. The mongo daemon is owned by the root
 * `posttest:e2e` lifecycle hook (postdev-mongo.ts), not by this file.
 *
 * @returns Immediately.
 */
export async function globalTeardown(): Promise<void> {}

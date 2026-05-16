/**
 * One-time migration: copy Mongoose `Shop`, `Review`, `FeatureFlag` docs into
 * their Payload counterparts (`shops`, `reviews`, `feature-flags`). Idempotent:
 * re-running skips docs that already exist (by domain / key / id).
 *
 * Invoke: `pnpm migrate:mongoose-to-payload`.
 * Environment: MUST run AFTER deploying code that uses payload.local services
 * (otherwise the storefront reads return empty until this script runs).
 */

// Note: @nordcom/commerce-cms/config exports buildPayloadConfig; we import the
// shared default config builder so the same Payload instance the app uses.
import { buildPayloadConfig } from '@nordcom/commerce-cms/config';
import { getPayload, type Payload } from 'payload';

import { FeatureFlagModel, ReviewModel, ShopModel } from '../src/models';

export const migrateShops = async (payload: Payload): Promise<{ migrated: number; skipped: number }> => {
    let migrated = 0;
    let skipped = 0;
    const cursor = ShopModel.find({}).cursor();
    for await (const doc of cursor) {
        const plain = doc.toObject({ flattenMaps: true, flattenObjectIds: true, depopulate: true });
        const { _id: _id_, __v: __v_, ...data } = plain as Record<string, unknown> & { _id?: unknown; __v?: unknown };

        const { docs: existing } = await payload.find({
            collection: 'shops' as never,
            where: { domain: { equals: data.domain } } as never,
            limit: 1,
            overrideAccess: true,
        });
        if (existing.length > 0) {
            skipped += 1;
            continue;
        }

        try {
            await payload.create({ collection: 'shops' as never, data: data as never, overrideAccess: true });
            migrated += 1;
        } catch (err) {
            // biome-ignore lint/suspicious/noConsole: migration script reports failures
            console.error(`[migrate] failed to migrate shop domain=${String(data.domain)}:`, err);
        }
    }
    // biome-ignore lint/suspicious/noConsole: migration script reports progress
    console.log(`[migrate] shops: ${migrated} migrated, ${skipped} skipped`);
    return { migrated, skipped };
};

export const migrateFeatureFlags = async (payload: Payload): Promise<{ migrated: number; skipped: number }> => {
    let migrated = 0;
    let skipped = 0;
    const cursor = FeatureFlagModel.find({}).cursor();
    for await (const doc of cursor) {
        const plain = doc.toObject({ flattenMaps: true, flattenObjectIds: true });
        const { _id: _id_, __v: __v_, ...data } = plain as Record<string, unknown> & { _id?: unknown; __v?: unknown };

        const { docs: existing } = await payload.find({
            collection: 'feature-flags' as never,
            where: { key: { equals: data.key } } as never,
            limit: 1,
            overrideAccess: true,
        });
        if (existing.length > 0) {
            skipped += 1;
            continue;
        }

        try {
            await payload.create({ collection: 'feature-flags' as never, data: data as never, overrideAccess: true });
            migrated += 1;
        } catch (err) {
            // biome-ignore lint/suspicious/noConsole: migration script reports failures
            console.error(`[migrate] failed to migrate feature flag key=${String(data.key)}:`, err);
        }
    }
    // biome-ignore lint/suspicious/noConsole: migration script reports progress
    console.log(`[migrate] feature-flags: ${migrated} migrated, ${skipped} skipped`);
    return { migrated, skipped };
};

export const migrateReviews = async (payload: Payload): Promise<{ migrated: number; skipped: number }> => {
    let migrated = 0;
    let skipped = 0;
    const cursor = ReviewModel.find({}).cursor();
    for await (const doc of cursor) {
        const plain = doc.toObject({ flattenMaps: true, flattenObjectIds: true, depopulate: true });
        const {
            _id: _id_,
            __v: __v_,
            shop: embeddedShop,
            ...rest
        } = plain as Record<string, unknown> & {
            _id?: unknown;
            __v?: unknown;
            shop?: { _id?: unknown; domain?: string };
        };

        const shopDomain = embeddedShop?.domain;
        if (!shopDomain) {
            // biome-ignore lint/suspicious/noConsole: migration script reports skips
            console.error(`[migrate] review _id=${String(_id_)} has no embedded shop.domain, skipping`);
            skipped += 1;
            continue;
        }

        const { docs: shopDocs } = await payload.find({
            collection: 'shops' as never,
            where: { domain: { equals: shopDomain } } as never,
            limit: 1,
            overrideAccess: true,
        });
        const targetShop = shopDocs[0] as { id: string } | undefined;
        if (!targetShop) {
            // biome-ignore lint/suspicious/noConsole: migration script reports skips
            console.error(`[migrate] no Payload shop for domain=${shopDomain}, skipping review _id=${String(_id_)}`);
            skipped += 1;
            continue;
        }

        try {
            await payload.create({
                collection: 'reviews' as never,
                data: { ...rest, shop: targetShop.id } as never,
                overrideAccess: true,
            });
            migrated += 1;
        } catch (err) {
            // biome-ignore lint/suspicious/noConsole: migration script reports failures
            console.error(`[migrate] failed to migrate review _id=${String(_id_)}:`, err);
        }
    }
    // biome-ignore lint/suspicious/noConsole: migration script reports progress
    console.log(`[migrate] reviews: ${migrated} migrated, ${skipped} skipped`);
    return { migrated, skipped };
};

export const main = async (): Promise<void> => {
    const secret = process.env.PAYLOAD_SECRET;
    const mongoUrl = process.env.MONGODB_URI;
    if (!secret || !mongoUrl) {
        throw new Error('[migrate] PAYLOAD_SECRET and MONGODB_URI must be set');
    }
    const config = await buildPayloadConfig({ secret, mongoUrl, includeAdmin: false, enableStorage: false });
    const payload = await getPayload({ config });

    // biome-ignore lint/suspicious/noConsole: migration script reports progress
    console.log('[migrate] starting Mongoose → Payload migration');
    await migrateShops(payload);
    await migrateFeatureFlags(payload);
    await migrateReviews(payload);
    // biome-ignore lint/suspicious/noConsole: migration script reports progress
    console.log('[migrate] done');
};

if (import.meta.url === `file://${process.argv[1]}`) {
    main()
        .then(() => process.exit(0))
        .catch((err) => {
            // biome-ignore lint/suspicious/noConsole: migration script reports fatals
            console.error('[migrate] fatal:', err);
            process.exit(1);
        });
}

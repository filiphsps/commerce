// biome-ignore-all lint/suspicious/noConsole: CLI script — logging is the point.
/**
 * One-shot migration: convert `shops.collaborators[].user` from BSON
 * ObjectId to its 24-char hex string form so Payload's text-typed
 * `collaborators.user` field can match by string equality.
 *
 * Background: Payload's CMS schema declares `collaborators.user` as
 * `text`, but legacy writes (via the Mongoose bridge) stored the value
 * as an ObjectId. Payload's `find({ where: { 'collaborators.user': {
 * equals: '<id>' } } })` issues a string-equals query that never matches
 * the stored ObjectId, so `Shop.findByCollaborator()` returned nothing
 * even when the user was an actual collaborator.
 *
 * Dry-run by default. Set `DRY_RUN=false` to apply.
 *
 *   pnpm dotenv -c -- tsx packages/db/scripts/migrate-shop-collaborator-ids.ts
 *   DRY_RUN=false pnpm dotenv -c -- tsx packages/db/scripts/migrate-shop-collaborator-ids.ts
 */
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI is required');
    process.exit(1);
}

const DRY_RUN = process.env.DRY_RUN !== 'false';

type Collaborator = {
    user?: unknown;
    permissions?: string[] | null;
};

function asString(value: unknown): string | null {
    if (typeof value === 'string') return value;
    if (value instanceof mongoose.Types.ObjectId) return value.toString();
    if (
        value !== null &&
        typeof value === 'object' &&
        'toString' in value &&
        typeof (value as { toString: unknown }).toString === 'function'
    ) {
        const s = (value as { toString: () => string }).toString();
        // ObjectId.toString() yields 24-char hex; reject `[object Object]`.
        return /^[a-f0-9]{24}$/i.test(s) ? s : null;
    }
    return null;
}

async function main() {
    await mongoose.connect(uri as string);
    const Shops = mongoose.connection.collection('shops');

    const cursor = Shops.find({ 'collaborators.user': { $exists: true } });
    let inspected = 0;
    let changed = 0;
    let unchanged = 0;
    const warnings: string[] = [];

    for await (const shop of cursor) {
        inspected++;
        const collaborators: Collaborator[] = Array.isArray(shop.collaborators) ? shop.collaborators : [];
        let dirty = false;
        const next = collaborators.map((c) => {
            const normalized = asString(c.user);
            if (normalized === null) {
                warnings.push(`shop ${shop._id}: collaborator user value not convertible: ${JSON.stringify(c.user)}`);
                return c;
            }
            if (c.user !== normalized) {
                dirty = true;
                return { ...c, user: normalized };
            }
            return c;
        });

        if (dirty) {
            changed++;
            if (!DRY_RUN) {
                await Shops.updateOne({ _id: shop._id }, { $set: { collaborators: next } });
            }
        } else {
            unchanged++;
        }
    }

    console.log(
        `[migrate-shop-collaborator-ids] inspected=${inspected} changed=${changed} unchanged=${unchanged} dryRun=${DRY_RUN ? 'true' : 'false'}`,
    );
    if (warnings.length > 0) {
        console.warn(`[migrate-shop-collaborator-ids] ${warnings.length} warning(s):`);
        for (const w of warnings) console.warn(`  - ${w}`);
    }

    await mongoose.disconnect();
}

main().catch((e: unknown) => {
    console.error(e);
    process.exit(1);
});

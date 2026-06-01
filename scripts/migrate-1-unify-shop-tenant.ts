#!/usr/bin/env tsx
/**
 * Migration-1 backfill (idempotent, re-runnable): reconcile the injected `tenant` linkage on every
 * tenant-scoped collection to the unified shop-row-id identity. After UNIFY-03 the multi-tenant
 * plugin's `tenantsSlug` is `shops`, so the canonical tenant id IS the shop row id. Legacy documents
 * created while `tenants` was a separate collection still point `tenant` at a stale `tenants._id`;
 * this script remaps each to the canonical shop id via the old tenant row's `shopId` back-reference.
 *
 * The transform core (everything above `main`) is pure and exported so Phase-7 can reuse it on the
 * Convex side. The Mongo-touching runner (`main`) only executes when the file is invoked directly;
 * importing the module (e.g. from the unit tests) never connects to a database.
 *
 * Usage:
 *   tsx scripts/migrate-1-unify-shop-tenant.ts --dry-run   # report counts, write nothing
 *   tsx scripts/migrate-1-unify-shop-tenant.ts             # relink tenant refs in place
 *
 * Idempotency: a document whose `tenant` is already a valid shop id is skipped, so a second run is a
 * no-op.
 */
import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import mongoose from 'mongoose';

/** A raw Mongo document read off the native driver. */
export type Doc = Record<string, unknown>;

/**
 * The raw `_id` read off a lean document is `unknown`, but the native driver's `Filter` generic
 * pins `_id` to `ObjectId`. We match the document we just read back, so the value is correct at
 * runtime; this seam helper asserts it past the generic without widening the rest of the filter.
 *
 * @param id - The `_id` value read off the document.
 * @returns A `{ _id }` filter the driver accepts.
 */
const byId = (id: unknown): { _id: never } => ({ _id: id as never });

/**
 * The injected-tenant collections registered with `@payloadcms/plugin-multi-tenant`. Kept in sync
 * with `tenantScopedCollections` in `packages/cms/src/collections/index.ts`; each Payload slug is
 * also its Mongo collection name.
 */
export const TENANT_SCOPED_COLLECTIONS = [
    'pages',
    'articles',
    'productMetadata',
    'collectionMetadata',
    'header',
    'footer',
    'businessData',
    'media',
    'reviews',
] as const;

/** Canonical lookups for tenant reconciliation. */
export interface TenantLookup {
    /** Every valid canonical shop row id. */
    validShopIds: ReadonlySet<string>;
    /** Map from a legacy `tenants._id` to its back-referenced canonical shop id (`tenants.shopId`). */
    tenantToShop: ReadonlyMap<string, string>;
}

/** Outcome of planning one tenant-scoped document. */
export interface TenantPlan {
    action: 'skip' | 'relink' | 'unresolved';
    shopId?: string;
}

/** Aggregate report for a batch of tenant-scoped documents — the exact counts a `--dry-run` prints. */
export interface TenantMigrationReport {
    scanned: number;
    alreadyCanonical: number;
    relink: number;
    unresolved: number;
    /** Documents with no `tenant` field at all (nothing to reconcile). */
    noTenant: number;
    relinks: Array<{ doc: Doc; shopId: string }>;
    unresolvedDocs: Doc[];
}

/**
 * Coerces a Mongo reference value to its canonical string id, or `null` when none can be derived.
 * Handles a plain string id, a BSON `ObjectId` (via `toHexString`), an extended-JSON `{ $oid }`
 * wrapper, and a sub-document that nests its own `_id`/`id`. Pure and side-effect-free.
 *
 * @param value - The raw reference value read off a document.
 * @returns The id as a non-empty string, or `null` when none is present.
 */
export const toIdString = (value: unknown): string | null => {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }
    if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        const hex = obj.toHexString;
        if (typeof hex === 'function') {
            const out = (hex as () => unknown).call(obj);
            if (typeof out === 'string' && out.length > 0) return out;
        }
        if (typeof obj.$oid === 'string' && obj.$oid.length > 0) return obj.$oid;
        if ('_id' in obj) {
            const nested = toIdString(obj._id);
            if (nested) return nested;
        }
        if (typeof obj.id === 'string' && obj.id.trim().length > 0) return obj.id.trim();
    }
    return null;
};

/**
 * Resolves a document's `tenant` value to a canonical shop row id. A value that already names a
 * valid shop is returned unchanged (idempotent); otherwise the legacy `tenants._id` is mapped to its
 * back-referenced shop id, and only when that resolves to a valid shop.
 *
 * @param tenant - The raw `tenant` value off the document.
 * @param lookup - Canonical lookups for tenant reconciliation.
 * @returns The canonical shop row id, or `null` when the tenant cannot be matched.
 */
export const resolveCanonicalTenantId = (tenant: unknown, lookup: TenantLookup): string | null => {
    const id = toIdString(tenant);
    if (!id) return null;
    if (lookup.validShopIds.has(id)) return id;
    const mapped = lookup.tenantToShop.get(id);
    if (mapped && lookup.validShopIds.has(mapped)) return mapped;
    return null;
};

/**
 * Reports whether a document's `tenant` already names a valid canonical shop row id.
 *
 * @param doc - The raw tenant-scoped document.
 * @param validShopIds - Every valid canonical shop row id.
 * @returns `true` when `tenant` is set and already canonical.
 */
export const tenantIsCanonical = (doc: Doc, validShopIds: ReadonlySet<string>): boolean => {
    const id = toIdString(doc.tenant);
    return id !== null && validShopIds.has(id);
};

/**
 * Plans the reconciliation of a single tenant-scoped document.
 *
 * @param doc - The raw tenant-scoped document.
 * @param lookup - Canonical lookups for tenant reconciliation.
 * @returns A skip plan when `tenant` is absent or already canonical, a relink plan carrying the
 *   canonical shop id, or an unresolved plan when the legacy tenant cannot be mapped.
 */
export const planTenantDoc = (doc: Doc, lookup: TenantLookup): TenantPlan => {
    if (doc.tenant === undefined || doc.tenant === null) return { action: 'skip' };
    if (tenantIsCanonical(doc, lookup.validShopIds)) return { action: 'skip' };
    const shopId = resolveCanonicalTenantId(doc.tenant, lookup);
    if (!shopId) return { action: 'unresolved' };
    return { action: 'relink', shopId };
};

/**
 * Returns a document with its `tenant` field rewritten to the canonical shop id. Pure — produces a
 * new object and never mutates the input.
 *
 * @param doc - The raw tenant-scoped document.
 * @param shopId - The canonical shop row id to assign.
 * @returns A shallow copy of `doc` with `tenant` set to `shopId`.
 */
export const applyTenantRelink = (doc: Doc, shopId: string): Doc => ({ ...doc, tenant: shopId });

/**
 * Plans a whole batch of tenant-scoped documents and tallies the exact counts a `--dry-run` reports.
 * This is the pure dry-run core: every count and pending write is derived without touching Mongo.
 *
 * @param docs - The raw tenant-scoped documents to scan.
 * @param lookup - Canonical lookups for tenant reconciliation.
 * @returns Per-batch counts plus the resolved relinks and the unresolved documents.
 */
export const planTenantDocs = (docs: readonly Doc[], lookup: TenantLookup): TenantMigrationReport => {
    const report: TenantMigrationReport = {
        scanned: docs.length,
        alreadyCanonical: 0,
        relink: 0,
        unresolved: 0,
        noTenant: 0,
        relinks: [],
        unresolvedDocs: [],
    };
    for (const doc of docs) {
        if (doc.tenant === undefined || doc.tenant === null) {
            report.noTenant += 1;
            continue;
        }
        const plan = planTenantDoc(doc, lookup);
        if (plan.action === 'skip') {
            report.alreadyCanonical += 1;
        } else if (plan.action === 'relink' && plan.shopId) {
            report.relink += 1;
            report.relinks.push({ doc, shopId: plan.shopId });
        } else {
            report.unresolved += 1;
            report.unresolvedDocs.push(doc);
        }
    }
    return report;
};

/**
 * Builds the set of valid canonical shop row ids from raw `shops` documents.
 *
 * @param shops - Raw shop documents (each with `_id`).
 * @returns The set of canonical shop row ids as strings.
 */
export const buildValidShopIds = (shops: readonly Doc[]): Set<string> => {
    const ids = new Set<string>();
    for (const shop of shops) {
        const id = toIdString(shop._id) ?? toIdString(shop.id);
        if (id) ids.add(id);
    }
    return ids;
};

/**
 * Builds the legacy-tenant → shop id map from raw `tenants` documents, keeping only rows whose
 * `shopId` back-reference resolves to a valid canonical shop.
 *
 * @param tenants - Raw documents from the legacy `tenants` collection (empty when none exist).
 * @param validShopIds - Every valid canonical shop row id.
 * @returns A map from `tenants._id` (string) to the canonical shop id.
 */
export const buildTenantToShop = (tenants: readonly Doc[], validShopIds: ReadonlySet<string>): Map<string, string> => {
    const map = new Map<string, string>();
    for (const tenant of tenants) {
        const tenantId = toIdString(tenant._id) ?? toIdString(tenant.id);
        const shopId = toIdString(tenant.shopId);
        if (tenantId && shopId && validShopIds.has(shopId)) map.set(tenantId, shopId);
    }
    return map;
};

/**
 * Connects to Mongo, scans every tenant-scoped collection, reports the exact relink counts, and —
 * unless `--dry-run` is passed — remaps each stale `tenant` ref to its canonical shop id. Exits with
 * a non-zero code when `MONGODB_URI` is unset or any document cannot be reconciled on a real run.
 *
 * @returns A promise that resolves once the run completes; the process exits explicitly.
 */
const main = async (): Promise<void> => {
    const dryRun = process.argv.includes('--dry-run');
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('[migrate-1-unify-shop-tenant] MONGODB_URI is not set; refusing to run.');
        process.exit(1);
    }

    await mongoose.connect(uri, { bufferCommands: false });
    const native = mongoose.connection.db;
    if (!native) {
        console.error('[migrate-1-unify-shop-tenant] no database handle after connect.');
        await mongoose.disconnect();
        process.exit(1);
    }

    try {
        const shops = (await native.collection('shops').find({}).toArray()) as unknown as Doc[];
        const collectionNames = new Set((await native.listCollections().toArray()).map((c) => c.name));
        const tenants = collectionNames.has('tenants')
            ? ((await native.collection('tenants').find({}).toArray()) as unknown as Doc[])
            : [];

        const validShopIds = buildValidShopIds(shops);
        const tenantToShop = buildTenantToShop(tenants, validShopIds);
        const lookup: TenantLookup = { validShopIds, tenantToShop };

        let totalRelink = 0;
        let totalUnresolved = 0;
        for (const name of TENANT_SCOPED_COLLECTIONS) {
            if (!collectionNames.has(name)) continue;
            const collection = native.collection(name);
            const docs = (await collection.find({}).toArray()) as unknown as Doc[];
            const report = planTenantDocs(docs, lookup);
            totalRelink += report.relink;
            totalUnresolved += report.unresolved;
            console.info(
                `[migrate-1-unify-shop-tenant] ${dryRun ? 'DRY-RUN ' : ''}${name}: scanned=${report.scanned} ` +
                    `canonical=${report.alreadyCanonical} noTenant=${report.noTenant} ` +
                    `relink=${report.relink} unresolved=${report.unresolved}`,
            );
            if (!dryRun) {
                for (const { doc, shopId } of report.relinks) {
                    await collection.updateOne(byId(doc._id), { $set: { tenant: shopId } });
                }
            }
        }

        console.info(
            `[migrate-1-unify-shop-tenant] ${dryRun ? 'DRY-RUN ' : ''}total relink=${totalRelink} ` +
                `unresolved=${totalUnresolved}`,
        );

        if (totalUnresolved > 0) {
            console.error(
                `[migrate-1-unify-shop-tenant] ${totalUnresolved} document(s) could not be reconciled to a ` +
                    'canonical shop id; leaving them untouched.',
            );
            await mongoose.disconnect();
            process.exit(1);
        }
    } finally {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
    }
    process.exit(0);
};

const thisFile = fileURLToPath(import.meta.url);
const invokedDirectly = process.argv.slice(1).some((arg) => {
    try {
        return realpathSync(resolve(arg)) === realpathSync(thisFile);
    } catch {
        return pathToFileURL(arg).href === import.meta.url;
    }
});

if (invokedDirectly) {
    await main().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[migrate-1-unify-shop-tenant] failed: ${message}`);
        process.exit(1);
    });
}

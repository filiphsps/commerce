#!/usr/bin/env tsx
/**
 * Migration-1 backfill (idempotent, re-runnable): rewrite legacy `reviews` documents that still
 * carry an embedded `ShopSchema` snapshot in their `shop` field to the unified shop row id ref
 * adopted by UNIFY-06 (`ReviewSchema.shop` is now a `String` id).
 *
 * The transform core (everything above `main`) is pure and exported so Phase-7 can reuse it when
 * re-homing the data on Convex. The Mongo-touching runner (`main`) only executes when the file is
 * invoked directly; importing the module (e.g. from the unit tests) never connects to a database.
 *
 * Usage:
 *   tsx scripts/migrate-1-reviews-shopid.ts --dry-run   # report counts, write nothing
 *   tsx scripts/migrate-1-reviews-shopid.ts             # rewrite embedded-shop reviews in place
 *
 * Idempotency: a review whose `shop` is already a string id is skipped, so a second run is a no-op.
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
 * Canonical shop lookups built once from the `shops` collection. `byDomain` maps a shop's primary
 * `domain` (the unique key) to its canonical row id; `validIds` is the set of every canonical shop
 * row id. A candidate resolves only to a member of `validIds`, so the migration can never point a
 * review at a non-existent shop.
 */
export interface ShopLookup {
    byDomain: ReadonlyMap<string, string>;
    validIds: ReadonlySet<string>;
}

/** Identity pulled from an embedded shop snapshot for canonical resolution. */
export interface ReviewShopCandidate {
    id: string | null;
    domain: string | null;
}

/** Outcome of planning one review: keep as-is, rewrite to `shopId`, or leave unresolved. */
export interface ReviewPlan {
    action: 'skip' | 'rewrite' | 'unresolved';
    shopId?: string;
}

/** Aggregate report for a batch of reviews — the exact counts a `--dry-run` prints. */
export interface ReviewMigrationReport {
    scanned: number;
    embedded: number;
    alreadyId: number;
    rewrite: number;
    unresolved: number;
    rewrites: Array<{ doc: Doc; shopId: string }>;
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
 * Reports whether a review still embeds a shop snapshot. After UNIFY-06 `shop` is a string id; a
 * non-null object value is the legacy embedded `ShopSchema`.
 *
 * @param review - The raw review document.
 * @returns `true` when `shop` is an embedded object (needs rewriting), `false` for a string id.
 */
export const isEmbeddedShopReview = (review: Doc): boolean => {
    const shop = review.shop;
    return typeof shop === 'object' && shop !== null;
};

/**
 * Extracts the identifying fields (`id`, `domain`) from a review's embedded shop snapshot so the
 * runner can resolve the canonical shop row.
 *
 * @param review - The raw review document with an embedded `shop`.
 * @returns The candidate id and domain; either may be `null` when the snapshot lacks it.
 */
export const extractReviewShopCandidate = (review: Doc): ReviewShopCandidate => {
    const shop = review.shop;
    if (!shop || typeof shop !== 'object') return { id: null, domain: null };
    const obj = shop as Record<string, unknown>;
    const domain = typeof obj.domain === 'string' && obj.domain.trim().length > 0 ? obj.domain.trim() : null;
    return { id: toIdString(shop), domain };
};

/**
 * Resolves an embedded-shop candidate to a canonical shop row id, preferring the unique `domain`
 * key and falling back to the embedded id only when it is itself a known canonical id. Never
 * invents an id, so the result is always a valid `shops` row or `null`.
 *
 * @param candidate - The id/domain pulled from the embedded snapshot.
 * @param lookup - Canonical shop lookups built from the `shops` collection.
 * @returns The canonical shop row id, or `null` when the candidate cannot be matched.
 */
export const resolveCanonicalShopId = (candidate: ReviewShopCandidate, lookup: ShopLookup): string | null => {
    if (candidate.domain) {
        const byDomain = lookup.byDomain.get(candidate.domain);
        if (byDomain) return byDomain;
    }
    if (candidate.id && lookup.validIds.has(candidate.id)) return candidate.id;
    return null;
};

/**
 * Plans the migration of a single review.
 *
 * @param review - The raw review document.
 * @param lookup - Canonical shop lookups built from the `shops` collection.
 * @returns A skip plan when `shop` is already an id, a rewrite plan with the resolved canonical id,
 *   or an unresolved plan when the embedded snapshot cannot be matched to a shop.
 */
export const planReview = (review: Doc, lookup: ShopLookup): ReviewPlan => {
    if (!isEmbeddedShopReview(review)) return { action: 'skip' };
    const shopId = resolveCanonicalShopId(extractReviewShopCandidate(review), lookup);
    if (!shopId) return { action: 'unresolved' };
    return { action: 'rewrite', shopId };
};

/**
 * Returns a review with its `shop` field rewritten to the canonical id string. Pure — produces a
 * new object and never mutates the input.
 *
 * @param review - The raw review document.
 * @param shopId - The canonical shop row id to assign.
 * @returns A shallow copy of `review` with `shop` set to `shopId`.
 */
export const applyReviewShopId = (review: Doc, shopId: string): Doc => ({ ...review, shop: shopId });

/**
 * Plans a whole batch of reviews and tallies the exact counts a `--dry-run` reports. This is the
 * pure dry-run core: it derives every count and the list of pending writes without touching Mongo.
 *
 * @param reviews - The raw review documents to scan.
 * @param lookup - Canonical shop lookups built from the `shops` collection.
 * @returns Per-batch counts plus the resolved rewrites and the unresolved documents.
 */
export const planReviews = (reviews: readonly Doc[], lookup: ShopLookup): ReviewMigrationReport => {
    const report: ReviewMigrationReport = {
        scanned: reviews.length,
        embedded: 0,
        alreadyId: 0,
        rewrite: 0,
        unresolved: 0,
        rewrites: [],
        unresolvedDocs: [],
    };
    for (const review of reviews) {
        const plan = planReview(review, lookup);
        if (plan.action === 'skip') {
            report.alreadyId += 1;
            continue;
        }
        report.embedded += 1;
        if (plan.action === 'rewrite' && plan.shopId) {
            report.rewrite += 1;
            report.rewrites.push({ doc: review, shopId: plan.shopId });
        } else {
            report.unresolved += 1;
            report.unresolvedDocs.push(review);
        }
    }
    return report;
};

/**
 * Builds the canonical shop lookups from raw `shops` documents.
 *
 * @param shops - Raw shop documents (each with `_id` and `domain`).
 * @returns A {@link ShopLookup} keyed by domain and id.
 */
export const buildShopLookup = (shops: readonly Doc[]): ShopLookup => {
    const byDomain = new Map<string, string>();
    const validIds = new Set<string>();
    for (const shop of shops) {
        const id = toIdString(shop._id) ?? toIdString(shop.id);
        if (!id) continue;
        validIds.add(id);
        const domain = shop.domain;
        if (typeof domain === 'string' && domain.trim().length > 0) byDomain.set(domain.trim(), id);
    }
    return { byDomain, validIds };
};

/**
 * Connects to Mongo, scans the `reviews` collection, reports the exact backfill counts, and — unless
 * `--dry-run` is passed — rewrites every embedded-shop review to its canonical shop id. Exits with a
 * non-zero code when `MONGODB_URI` is unset or any embedded review cannot be resolved on a real run.
 *
 * @returns A promise that resolves once the run completes; the process exits explicitly.
 */
const main = async (): Promise<void> => {
    const dryRun = process.argv.includes('--dry-run');
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('[migrate-1-reviews-shopid] MONGODB_URI is not set; refusing to run.');
        process.exit(1);
    }

    await mongoose.connect(uri, { bufferCommands: false });
    const native = mongoose.connection.db;
    if (!native) {
        console.error('[migrate-1-reviews-shopid] no database handle after connect.');
        await mongoose.disconnect();
        process.exit(1);
    }

    try {
        const reviewsCol = native.collection('reviews');
        const shops = (await native.collection('shops').find({}).toArray()) as unknown as Doc[];
        const reviews = (await reviewsCol.find({}).toArray()) as unknown as Doc[];
        const lookup = buildShopLookup(shops);
        const report = planReviews(reviews, lookup);

        console.info(
            `[migrate-1-reviews-shopid] ${dryRun ? 'DRY-RUN ' : ''}scanned=${report.scanned} ` +
                `embedded=${report.embedded} alreadyId=${report.alreadyId} ` +
                `rewrite=${report.rewrite} unresolved=${report.unresolved}`,
        );

        if (!dryRun) {
            for (const { doc, shopId } of report.rewrites) {
                await reviewsCol.updateOne(byId(doc._id), { $set: { shop: shopId } });
            }
            console.info(`[migrate-1-reviews-shopid] rewrote ${report.rewrites.length} review(s).`);
        }

        if (report.unresolved > 0) {
            console.error(
                `[migrate-1-reviews-shopid] ${report.unresolved} embedded-shop review(s) could not be ` +
                    'resolved to a canonical shop id; leaving them untouched.',
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
        console.error(`[migrate-1-reviews-shopid] failed: ${message}`);
        process.exit(1);
    });
}

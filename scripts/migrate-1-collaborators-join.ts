#!/usr/bin/env tsx
/**
 * Migration-1 backfill (idempotent, re-runnable): convert the embedded `collaborators` array on
 * legacy `shops` documents to the de-embedded join shape adopted by UNIFY-11. Each row's `user`
 * field was a `Schema.Types.ObjectId` ref (or, after population, a full embedded user document); the
 * canonical `ShopCollaborator` join stores `user` as a plain string id paired with a `permissions`
 * string array — the shape CONVEXCORE-04 mirrors on Convex as a `shopCollaborators` table.
 *
 * The transform core (everything above `main`) is pure and exported so Phase-7 can reuse it on the
 * Convex side. The Mongo-touching runner (`main`) only executes when the file is invoked directly;
 * importing the module (e.g. from the unit tests) never connects to a database.
 *
 * Usage:
 *   tsx scripts/migrate-1-collaborators-join.ts --dry-run   # report counts, write nothing
 *   tsx scripts/migrate-1-collaborators-join.ts             # normalize collaborator arrays in place
 *
 * Idempotency: a shop whose collaborator rows are already `{ user: string, permissions: string[] }`
 * is skipped, so a second run is a no-op.
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

/** The canonical de-embedded collaborator join row (mirrors `ShopCollaborator` in `@nordcom/commerce-db`). */
export interface CollaboratorJoin {
    user: string;
    permissions: string[];
}

/** Outcome of converting one shop's collaborators array. */
export interface CollaboratorConversion {
    collaborators: CollaboratorJoin[];
    changed: boolean;
    /** Rows discarded because no user id could be derived (corrupt legacy data). */
    dropped: number;
}

/** Aggregate report for a batch of shops — the exact counts a `--dry-run` prints. */
export interface CollaboratorMigrationReport {
    scanned: number;
    shopsChanged: number;
    rowsConverted: number;
    rowsDropped: number;
    writes: Array<{ doc: Doc; collaborators: CollaboratorJoin[] }>;
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
 * Reports whether a collaborator row is already in the canonical join shape — a non-empty string
 * `user` and a `permissions` array of strings. Such rows are left byte-identical so a re-run is a
 * no-op. The per-subdoc `_id` Mongoose adds to array entries is irrelevant here (the read path
 * strips it) and does not count as needing conversion.
 *
 * @param row - A single raw collaborator value.
 * @returns `true` when the row already matches the join shape.
 */
export const isCanonicalCollaborator = (row: unknown): boolean => {
    if (!row || typeof row !== 'object') return false;
    const obj = row as Record<string, unknown>;
    if (typeof obj.user !== 'string' || obj.user.trim().length === 0) return false;
    if (!Array.isArray(obj.permissions)) return false;
    return obj.permissions.every((permission) => typeof permission === 'string');
};

/**
 * Normalizes a single legacy collaborator row to the canonical join shape, resolving `user` to a
 * string id and coercing `permissions` to a string array. Returns `null` when no user id can be
 * derived (the row is corrupt and is dropped by the caller).
 *
 * @param row - A single raw collaborator value (ObjectId-`user`, embedded-user, or already-clean).
 * @returns The canonical `{ user, permissions }` row, or `null` when `user` cannot be resolved.
 */
export const normalizeCollaborator = (row: unknown): CollaboratorJoin | null => {
    if (!row || typeof row !== 'object') return null;
    const obj = row as Record<string, unknown>;
    const user = toIdString(obj.user);
    if (!user) return null;
    const permissions = Array.isArray(obj.permissions) ? obj.permissions.map((permission) => String(permission)) : [];
    return { user, permissions };
};

/**
 * Converts a shop's `collaborators` array to the canonical join shape, leaving already-canonical
 * rows untouched and dropping rows whose `user` cannot be resolved.
 *
 * @param shop - The raw shop document.
 * @returns The converted array, whether anything changed, and how many rows were dropped.
 */
export const convertShopCollaborators = (shop: Doc): CollaboratorConversion => {
    const raw = shop.collaborators;
    if (!Array.isArray(raw)) return { collaborators: [], changed: false, dropped: 0 };

    const collaborators: CollaboratorJoin[] = [];
    let changed = false;
    let dropped = 0;
    for (const row of raw) {
        if (isCanonicalCollaborator(row)) {
            const obj = row as Record<string, unknown>;
            collaborators.push({ user: obj.user as string, permissions: [...(obj.permissions as string[])] });
            continue;
        }
        changed = true;
        const normalized = normalizeCollaborator(row);
        if (!normalized) {
            dropped += 1;
            continue;
        }
        collaborators.push(normalized);
    }
    return { collaborators, changed, dropped };
};

/**
 * Returns a shop with its `collaborators` array replaced by the canonical join rows. Pure — produces
 * a new object and never mutates the input.
 *
 * @param shop - The raw shop document.
 * @param collaborators - The canonical collaborator join rows to assign.
 * @returns A shallow copy of `shop` with `collaborators` set to the join rows.
 */
export const applyShopCollaborators = (shop: Doc, collaborators: CollaboratorJoin[]): Doc => ({
    ...shop,
    collaborators,
});

/**
 * Plans a whole batch of shops and tallies the exact counts a `--dry-run` reports. This is the pure
 * dry-run core: every count and pending write is derived without touching Mongo.
 *
 * @param shops - The raw shop documents to scan.
 * @returns Per-batch counts plus the resolved writes.
 */
export const planShopCollaborators = (shops: readonly Doc[]): CollaboratorMigrationReport => {
    const report: CollaboratorMigrationReport = {
        scanned: shops.length,
        shopsChanged: 0,
        rowsConverted: 0,
        rowsDropped: 0,
        writes: [],
    };
    for (const shop of shops) {
        const conversion = convertShopCollaborators(shop);
        if (!conversion.changed) continue;
        report.shopsChanged += 1;
        report.rowsConverted += conversion.collaborators.length;
        report.rowsDropped += conversion.dropped;
        report.writes.push({ doc: shop, collaborators: conversion.collaborators });
    }
    return report;
};

/**
 * Connects to Mongo, scans the `shops` collection, reports the exact conversion counts, and — unless
 * `--dry-run` is passed — rewrites every embedded collaborator array to the canonical join shape.
 * Exits with a non-zero code when `MONGODB_URI` is unset.
 *
 * @returns A promise that resolves once the run completes; the process exits explicitly.
 */
const main = async (): Promise<void> => {
    const dryRun = process.argv.includes('--dry-run');
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('[migrate-1-collaborators-join] MONGODB_URI is not set; refusing to run.');
        process.exit(1);
    }

    await mongoose.connect(uri, { bufferCommands: false });
    const native = mongoose.connection.db;
    if (!native) {
        console.error('[migrate-1-collaborators-join] no database handle after connect.');
        await mongoose.disconnect();
        process.exit(1);
    }

    try {
        const shopsCol = native.collection('shops');
        const shops = (await shopsCol.find({}).toArray()) as unknown as Doc[];
        const report = planShopCollaborators(shops);

        console.info(
            `[migrate-1-collaborators-join] ${dryRun ? 'DRY-RUN ' : ''}scanned=${report.scanned} ` +
                `shopsChanged=${report.shopsChanged} rowsConverted=${report.rowsConverted} ` +
                `rowsDropped=${report.rowsDropped}`,
        );

        if (!dryRun) {
            for (const { doc, collaborators } of report.writes) {
                await shopsCol.updateOne(byId(doc._id), { $set: { collaborators } });
            }
            console.info(`[migrate-1-collaborators-join] converted ${report.writes.length} shop(s).`);
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
        console.error(`[migrate-1-collaborators-join] failed: ${message}`);
        process.exit(1);
    });
}

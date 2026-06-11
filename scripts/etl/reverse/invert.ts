/**
 * CUTOVER-02 reverse-ETL core: inverts a Convex snapshot (a parsed `convex export`, or the staged
 * forward-transform output via {@link snapshotFromStaged}) back into Mongo-shaped restore documents
 * for the CORE collections — the shop family re-embedded into `shops`, plus `featureFlags`,
 * `reviews`, and the auth family (`users`/`sessions`/`identities`). This is the G2 rollback tool:
 * after the CUTOVER-03 authority flip, Convex is the only authority, so a rollback REPLACES each
 * Mongo core collection wholesale from this output (never a merge — see
 * `.specs/2026-05-30-convex-migration/one-way-gate.md`).
 *
 * CMS content is deliberately ABSENT: no ProseMirror→Lexical codec exists (CMSRICH built the forward
 * direction only), so CMS documents are one-way by the one-way gate. This module refuses the
 * temptation structurally by simply not knowing the CMS tables.
 *
 * Identity contract (the inversion of the PIPELINE-01 id-remap):
 * - `shops` / `featureFlags` rows preserve their source `ObjectId` as `legacyId` — the reverse
 *   restores it as the Mongo `_id`, so those identities round-trip exactly.
 * - `reviews` and the auth family carry NO `legacyId` (their validators never stored one), so their
 *   original ObjectIds are unrecoverable; {@link mintObjectIdHex} mints a DETERMINISTIC replacement
 *   from the Convex row id, keeping a re-run byte-identical and every internal reference
 *   (`sessions.user`, `collaborators.user`) consistent within the restored set.
 *
 * Pure throughout: no I/O, never mutates its input, and unresolvable rows are routed to the
 * divergence report (the proven PIPELINE-01 skip-bucket convention) instead of throwing.
 */
import { createHash } from 'node:crypto';

import type { Doc } from '../transform/id-remap';
import type { ConvexImportDataset } from '../transform/index';

/**
 * A parsed Convex snapshot keyed by table. Each row is the exported document: its `_id` (the live
 * Convex id — or the deterministic surrogate `payloadId` when built from the staged dataset) plus
 * the schema fields. `_creationTime` may be present on live exports and is ignored (it reflects the
 * import moment, not source identity).
 */
export interface ConvexSnapshotDataset {
    shops?: Doc[];
    shopCredentials?: Doc[];
    shopDomains?: Doc[];
    shopCollaborators?: Doc[];
    shopFeatureFlags?: Doc[];
    featureFlags?: Doc[];
    reviews?: Doc[];
    users?: Doc[];
    sessions?: Doc[];
    identities?: Doc[];
}

/** Every Convex table the reverse-ETL reads, in snapshot-read order. */
export const SNAPSHOT_TABLES = [
    'shops',
    'shopCredentials',
    'shopDomains',
    'shopCollaborators',
    'shopFeatureFlags',
    'featureFlags',
    'reviews',
    'users',
    'sessions',
    'identities',
] as const satisfies readonly (keyof ConvexSnapshotDataset)[];

/** Mongo-shaped restore documents (mongoimport-ready extended JSON), keyed by target collection. */
export interface MongoRestoreDataset {
    shops: Doc[];
    featureFlags: Doc[];
    reviews: Doc[];
    users: Doc[];
    sessions: Doc[];
    identities: Doc[];
}

/** The Mongo collections the reverse-ETL restores, in restore order (referenced rows first). */
export const MONGO_RESTORE_COLLECTIONS = [
    'shops',
    'featureFlags',
    'reviews',
    'users',
    'sessions',
    'identities',
] as const satisfies readonly (keyof MongoRestoreDataset)[];

/** Why one snapshot row could not be (fully) inverted. */
export type ReverseDivergenceReason =
    | 'missing-row-id'
    | 'missing-legacy-id'
    | 'unresolved-shop-reference'
    | 'unresolved-flag-reference'
    | 'unresolved-user-reference'
    | 'duplicate-credentials-row'
    | 'credentials-without-shopify-provider'
    | 'domain-set-mismatch'
    | 'invalid-timestamp';

/** One reported inversion divergence: the offending snapshot row and why it diverged. */
export interface ReverseDivergence {
    /** The Convex table the offending row came from. */
    table: string;
    /** The snapshot row's `_id` (or `'?'` when the row carried none). */
    id: string;
    /** The divergence class. */
    reason: ReverseDivergenceReason;
}

/** The full reverse-ETL result: the restore documents plus every divergence encountered. */
export interface ReverseResult {
    collections: MongoRestoreDataset;
    divergences: ReverseDivergence[];
}

/**
 * Adapts the staged forward-transform output into snapshot shape, with each row's deterministic
 * surrogate `payloadId` standing in for the live `_id`. This is what lets the round-trip gate run
 * `forward → reverse` without a deployment: the reference fields in staged documents already carry
 * surrogate ids, so the same id-keyed maps resolve in both worlds. Pure.
 *
 * @param dataset - The forward transform output.
 * @returns The equivalent snapshot dataset.
 */
export const snapshotFromStaged = (dataset: ConvexImportDataset): ConvexSnapshotDataset => {
    const out: ConvexSnapshotDataset = {};
    for (const table of Object.keys(dataset) as Array<keyof ConvexImportDataset>) {
        out[table] = dataset[table].map((row) => ({ _id: row.payloadId, ...row.document }));
    }
    return out;
};

/**
 * Mints a deterministic 24-hex Mongo `ObjectId` string for a row whose original ObjectId was not
 * preserved (no `legacyId`). Derived from the namespaced Convex row id via sha-256 so a re-run of
 * the reverse stage emits byte-identical ids — the property that keeps restored cross-references
 * (`sessions.user`, embedded collaborator refs) stable across runs.
 *
 * @param table - The source Convex table, namespacing the derivation.
 * @param seed - The Convex row id (or embedded sub-id) to derive from.
 * @returns A 24-hex ObjectId string.
 */
export const mintObjectIdHex = (table: string, seed: string): string =>
    createHash('sha256').update(`mongo-restore ${table} ${seed}`).digest('hex').slice(0, 24);

/** Wraps an ObjectId hex in the mongoimport extended-JSON reference shape. */
const oidRef = (hex: string): Doc => ({ $oid: hex });

/**
 * Converts a stored epoch-ms timestamp back to the mongoimport extended-JSON date shape, or
 * `undefined` when the value is not a finite number (the caller records the divergence).
 *
 * @param value - The stored numeric timestamp.
 * @returns The `{ $date }` wrapper, or `undefined` when unconvertible.
 */
const toExtendedDate = (value: unknown): Doc | undefined => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    return { $date: new Date(value).toISOString() };
};

/** Matches a 24-hex Mongo ObjectId string. */
const OBJECT_ID_HEX = /^[0-9a-f]{24}$/i;

/**
 * Builds a new document holding only `keys` present and defined on `source`, in the given order —
 * the reverse-side twin of the forward transform's projection helper, so unknown/system fields
 * (`_creationTime`, anything outside the validator) never leak into a restore document. Pure.
 *
 * @param source - The snapshot row to project.
 * @param keys - The keys to keep, in output order.
 * @returns A fresh document with the picked fields.
 */
const pick = (source: Doc, keys: readonly string[]): Doc => {
    const out: Doc = {};
    for (const key of keys) {
        if (key in source && source[key] !== undefined) out[key] = source[key];
    }
    return out;
};

/**
 * Non-timestamp shop fields restored verbatim. Mirrors the forward transform's
 * `SHOP_PASSTHROUGH_KEYS` (minus `createdAt`/`updatedAt`, restored as `$date`); the round-trip gate
 * (`./round-trip.ts`) is the drift guard — a key added to one side without the other reads as a
 * checksum divergence, never as silent agreement.
 */
const SHOP_RESTORE_KEYS = [
    'name',
    'description',
    'domain',
    'alternativeDomains',
    'i18n',
    'commerce',
    'showProductVendor',
    'design',
    'theme',
    'icons',
    'integrations',
    'thirdParty',
] as const;

/** Non-timestamp feature-flag fields restored verbatim (forward `FEATURE_FLAG_PASSTHROUGH_KEYS` twin). */
const FEATURE_FLAG_RESTORE_KEYS = ['key', 'kind', 'description', 'defaultValue', 'options', 'targeting'] as const;

/** OAuth identity attributes shared by standalone and embedded identity rows (minus dates). */
const IDENTITY_ATTRIBUTE_KEYS = ['provider', 'identity', 'scope', 'refreshToken', 'accessToken'] as const;

/** One indexed snapshot row: its string `_id` plus the document. */
interface IndexedRow {
    id: string;
    doc: Doc;
}

/**
 * Indexes a snapshot table's rows by their string `_id`, reporting (and skipping) rows without one.
 *
 * @param rows - The table's snapshot rows.
 * @param table - The table name, for divergence reporting.
 * @param divergences - The shared divergence sink.
 * @returns The indexed rows in snapshot order.
 */
const indexRows = (rows: readonly Doc[] | undefined, table: string, divergences: ReverseDivergence[]): IndexedRow[] => {
    const out: IndexedRow[] = [];
    for (const doc of rows ?? []) {
        const id = typeof doc._id === 'string' && doc._id.length > 0 ? doc._id : null;
        if (!id) {
            divergences.push({ table, id: '?', reason: 'missing-row-id' });
            continue;
        }
        out.push({ id, doc });
    }
    return out;
};

/**
 * Restores the row's `createdAt`/`updatedAt` epoch-ms fields as `$date` wrappers onto `target`,
 * reporting a divergence for any non-finite value.
 *
 * @param target - The restore document being assembled (mutated by design — it is freshly built).
 * @param row - The indexed snapshot row.
 * @param table - The table name, for divergence reporting.
 * @param divergences - The shared divergence sink.
 */
const restoreTimestamps = (target: Doc, row: IndexedRow, table: string, divergences: ReverseDivergence[]): void => {
    for (const key of ['createdAt', 'updatedAt'] as const) {
        const date = toExtendedDate(row.doc[key]);
        if (date) target[key] = date;
        else divergences.push({ table, id: row.id, reason: 'invalid-timestamp' });
    }
};

/**
 * Re-embeds the shredded `shopCredentials` secrets into a sanitized Shopify `commerceProvider` —
 * the exact inverse of the forward `sanitizeCommerceProvider` split: `token` back onto
 * `authentication`, `clientSecret` back onto `authentication.customers`. A non-Shopify (or absent)
 * provider passes through unchanged; secrets attached to one anyway are reported, never guessed at.
 *
 * @param provider - The sanitized `commerceProvider` off the snapshot shop row.
 * @param credentials - The shop's `shopCredentials` row, when one exists.
 * @param shop - The indexed shop row, for divergence reporting.
 * @param divergences - The shared divergence sink.
 * @returns The restored provider value, or `undefined` when the shop never had one.
 */
const restoreCommerceProvider = (
    provider: unknown,
    credentials: Doc | undefined,
    shop: IndexedRow,
    divergences: ReverseDivergence[],
): unknown => {
    const token = typeof credentials?.token === 'string' ? credentials.token : undefined;
    const clientSecret = typeof credentials?.clientSecret === 'string' ? credentials.clientSecret : undefined;

    if (!provider || typeof provider !== 'object' || (provider as Doc).type !== 'shopify') {
        if (token !== undefined || clientSecret !== undefined) {
            divergences.push({ table: 'shopCredentials', id: shop.id, reason: 'credentials-without-shopify-provider' });
        }
        return provider;
    }

    const base = provider as Doc;
    const authentication: Doc = {
        ...(base.authentication && typeof base.authentication === 'object' ? (base.authentication as Doc) : {}),
    };
    if (token !== undefined) authentication.token = token;
    if (clientSecret !== undefined) {
        const customers =
            authentication.customers && typeof authentication.customers === 'object'
                ? { ...(authentication.customers as Doc) }
                : {};
        customers.clientSecret = clientSecret;
        authentication.customers = customers;
    }
    return { ...base, authentication };
};

/**
 * Restores one embedded OAuth identity from its Convex `users.identities` entry. The Convex `id` is
 * the migrated Mongo subdocument id when it parses as ObjectId hex; otherwise (a post-flip native
 * link, where the adapter assigned its own id) a deterministic replacement is minted.
 *
 * @param entry - One embedded identity off a snapshot user row.
 * @returns The Mongo-shaped embedded identity subdocument.
 */
const restoreEmbeddedIdentity = (entry: Doc): Doc => {
    const id = typeof entry.id === 'string' ? entry.id : '';
    const restored: Doc = {
        _id: oidRef(OBJECT_ID_HEX.test(id) ? id : mintObjectIdHex('users.identities', id)),
        ...pick(entry, IDENTITY_ATTRIBUTE_KEYS),
    };
    const expiresAt = toExtendedDate(entry.expiresAt);
    if (expiresAt) restored.expiresAt = expiresAt;
    const createdAt = toExtendedDate(entry.createdAt);
    if (createdAt) restored.createdAt = createdAt;
    const updatedAt = toExtendedDate(entry.updatedAt);
    if (updatedAt) restored.updatedAt = updatedAt;
    return restored;
};

/**
 * Orders restore documents by their `_id` hex so the output is byte-stable regardless of snapshot
 * row order (a live `convex export` orders by deployment-issued ids, which vary per import). Pure —
 * sorts a copy.
 *
 * @param docs - The restore documents.
 * @returns A new array sorted ascending by `_id.$oid`.
 */
const sortByObjectId = (docs: readonly Doc[]): Doc[] => {
    const hexOf = (doc: Doc): string => {
        const id = doc._id;
        return id && typeof id === 'object' && typeof (id as Doc).$oid === 'string' ? ((id as Doc).$oid as string) : '';
    };
    return [...docs].sort((left, right) => (hexOf(left) < hexOf(right) ? -1 : hexOf(left) > hexOf(right) ? 1 : 0));
};

/**
 * Inverts a Convex snapshot into Mongo-shaped restore documents for every core collection,
 * reporting (never throwing on) each row that cannot be faithfully inverted. Deterministic: the
 * same snapshot always yields byte-identical output, so the restore stage is re-runnable.
 *
 * The de-embedded shop side tables fold back into their parents: `shopCredentials` →
 * `commerceProvider` secrets, `shopFeatureFlags` → the embedded `featureFlags` ref array (ordered
 * by flag ObjectId; the source array order was not preserved by the forward fan-out and is not part
 * of the PIPELINE-04 parity contract), `shopCollaborators` → the embedded `collaborators` array.
 * `shopDomains` is purely derived from `domain`/`alternativeDomains` (both passthrough on the shop
 * row), so it restores nothing — it is instead CHECKED against the restored shop and any
 * disagreement is reported as `domain-set-mismatch`.
 *
 * @param snapshot - The parsed Convex snapshot.
 * @returns The restore documents plus every divergence.
 */
export const invertSnapshot = (snapshot: ConvexSnapshotDataset): ReverseResult => {
    const divergences: ReverseDivergence[] = [];

    const shopRows = indexRows(snapshot.shops, 'shops', divergences);
    const flagRows = indexRows(snapshot.featureFlags, 'featureFlags', divergences);
    const userRows = indexRows(snapshot.users, 'users', divergences);

    const legacyOf = (rows: readonly IndexedRow[], table: string): Map<string, string> => {
        const map = new Map<string, string>();
        for (const row of rows) {
            if (typeof row.doc.legacyId === 'string' && row.doc.legacyId.length > 0) {
                map.set(row.id, row.doc.legacyId);
            } else {
                divergences.push({ table, id: row.id, reason: 'missing-legacy-id' });
                map.set(row.id, mintObjectIdHex(table, row.id));
            }
        }
        return map;
    };
    const shopLegacy = legacyOf(shopRows, 'shops');
    const flagLegacy = legacyOf(flagRows, 'featureFlags');

    const mintedUserIds = new Map<string, string>();
    for (const row of userRows) mintedUserIds.set(row.id, mintObjectIdHex('users', row.id));

    const credentialsByShop = new Map<string, Doc>();
    for (const row of indexRows(snapshot.shopCredentials, 'shopCredentials', divergences)) {
        const shop = typeof row.doc.shop === 'string' ? row.doc.shop : null;
        if (!shop || !shopLegacy.has(shop)) {
            divergences.push({ table: 'shopCredentials', id: row.id, reason: 'unresolved-shop-reference' });
            continue;
        }
        if (credentialsByShop.has(shop)) {
            divergences.push({ table: 'shopCredentials', id: row.id, reason: 'duplicate-credentials-row' });
            continue;
        }
        credentialsByShop.set(shop, row.doc);
    }

    const flagRefsByShop = new Map<string, string[]>();
    for (const row of indexRows(snapshot.shopFeatureFlags, 'shopFeatureFlags', divergences)) {
        const shop = typeof row.doc.shop === 'string' ? row.doc.shop : null;
        const flag = typeof row.doc.flag === 'string' ? (flagLegacy.get(row.doc.flag) ?? null) : null;
        if (!shop || !shopLegacy.has(shop)) {
            divergences.push({ table: 'shopFeatureFlags', id: row.id, reason: 'unresolved-shop-reference' });
            continue;
        }
        if (!flag) {
            divergences.push({ table: 'shopFeatureFlags', id: row.id, reason: 'unresolved-flag-reference' });
            continue;
        }
        const refs = flagRefsByShop.get(shop) ?? [];
        refs.push(flag);
        flagRefsByShop.set(shop, refs);
    }

    const collaboratorsByShop = new Map<string, Doc[]>();
    for (const row of indexRows(snapshot.shopCollaborators, 'shopCollaborators', divergences)) {
        const shop = typeof row.doc.shop === 'string' ? row.doc.shop : null;
        if (!shop || !shopLegacy.has(shop)) {
            divergences.push({ table: 'shopCollaborators', id: row.id, reason: 'unresolved-shop-reference' });
            continue;
        }
        const user = typeof row.doc.user === 'string' ? (mintedUserIds.get(row.doc.user) ?? null) : null;
        if (!user) {
            divergences.push({ table: 'shopCollaborators', id: row.id, reason: 'unresolved-user-reference' });
            continue;
        }
        const permissions = Array.isArray(row.doc.permissions)
            ? row.doc.permissions.filter((value): value is string => typeof value === 'string')
            : [];
        const entries = collaboratorsByShop.get(shop) ?? [];
        entries.push({ user: oidRef(user), permissions });
        collaboratorsByShop.set(shop, entries);
    }

    const domainsByShop = new Map<string, Set<string>>();
    for (const row of indexRows(snapshot.shopDomains, 'shopDomains', divergences)) {
        const shop = typeof row.doc.shop === 'string' ? row.doc.shop : null;
        if (!shop || !shopLegacy.has(shop)) {
            divergences.push({ table: 'shopDomains', id: row.id, reason: 'unresolved-shop-reference' });
            continue;
        }
        const set = domainsByShop.get(shop) ?? new Set<string>();
        if (typeof row.doc.domain === 'string') set.add(row.doc.domain);
        domainsByShop.set(shop, set);
    }

    const shops: Doc[] = [];
    for (const row of shopRows) {
        const legacyId = shopLegacy.get(row.id);
        if (!legacyId) continue;
        const restored: Doc = { _id: oidRef(legacyId), ...pick(row.doc, SHOP_RESTORE_KEYS) };
        const provider = restoreCommerceProvider(
            row.doc.commerceProvider,
            credentialsByShop.get(row.id),
            row,
            divergences,
        );
        if (provider !== undefined) restored.commerceProvider = provider;

        const collaborators = collaboratorsByShop.get(row.id);
        if (collaborators && collaborators.length > 0) restored.collaborators = collaborators;

        const flagRefs = flagRefsByShop.get(row.id);
        if (flagRefs && flagRefs.length > 0) {
            restored.featureFlags = [...flagRefs].sort().map((hex) => ({ flag: oidRef(hex) }));
        }

        restoreTimestamps(restored, row, 'shops', divergences);
        shops.push(restored);

        const expectedDomains = new Set<string>();
        const addDomain = (candidate: unknown): void => {
            if (typeof candidate !== 'string') return;
            const domain = candidate.trim();
            if (domain.length > 0) expectedDomains.add(domain);
        };
        addDomain(row.doc.domain);
        if (Array.isArray(row.doc.alternativeDomains)) for (const entry of row.doc.alternativeDomains) addDomain(entry);
        const actualDomains = domainsByShop.get(row.id) ?? new Set<string>();
        const sameSize = expectedDomains.size === actualDomains.size;
        if (!sameSize || ![...expectedDomains].every((domain) => actualDomains.has(domain))) {
            divergences.push({ table: 'shopDomains', id: row.id, reason: 'domain-set-mismatch' });
        }
    }

    const featureFlags: Doc[] = [];
    for (const row of flagRows) {
        const legacyId = flagLegacy.get(row.id);
        if (!legacyId) continue;
        const restored: Doc = { _id: oidRef(legacyId), ...pick(row.doc, FEATURE_FLAG_RESTORE_KEYS) };
        restoreTimestamps(restored, row, 'featureFlags', divergences);
        featureFlags.push(restored);
    }

    const reviews: Doc[] = [];
    for (const row of indexRows(snapshot.reviews, 'reviews', divergences)) {
        const shop = typeof row.doc.shopId === 'string' ? (shopLegacy.get(row.doc.shopId) ?? null) : null;
        if (!shop) {
            divergences.push({ table: 'reviews', id: row.id, reason: 'unresolved-shop-reference' });
            continue;
        }
        const restored: Doc = { _id: oidRef(mintObjectIdHex('reviews', row.id)), shop: oidRef(shop) };
        restoreTimestamps(restored, row, 'reviews', divergences);
        reviews.push(restored);
    }

    const users: Doc[] = [];
    for (const row of userRows) {
        const minted = mintedUserIds.get(row.id);
        if (!minted) continue;
        const restored: Doc = { _id: oidRef(minted), ...pick(row.doc, ['email', 'name', 'avatar', 'groups']) };
        const emailVerified = toExtendedDate(row.doc.emailVerified);
        restored.emailVerified = row.doc.emailVerified === null ? null : (emailVerified ?? null);
        restored.identities = Array.isArray(row.doc.identities)
            ? row.doc.identities
                  .filter((entry): entry is Doc => Boolean(entry) && typeof entry === 'object')
                  .map(restoreEmbeddedIdentity)
            : [];
        restoreTimestamps(restored, row, 'users', divergences);
        users.push(restored);
    }

    const sessions: Doc[] = [];
    for (const row of indexRows(snapshot.sessions, 'sessions', divergences)) {
        const user = typeof row.doc.user === 'string' ? (mintedUserIds.get(row.doc.user) ?? null) : null;
        if (!user) {
            divergences.push({ table: 'sessions', id: row.id, reason: 'unresolved-user-reference' });
            continue;
        }
        const restored: Doc = {
            _id: oidRef(mintObjectIdHex('sessions', row.id)),
            user: oidRef(user),
            ...pick(row.doc, ['token']),
        };
        const expiresAt = toExtendedDate(row.doc.expiresAt);
        if (expiresAt) restored.expiresAt = expiresAt;
        else divergences.push({ table: 'sessions', id: row.id, reason: 'invalid-timestamp' });
        restoreTimestamps(restored, row, 'sessions', divergences);
        sessions.push(restored);
    }

    const identities: Doc[] = [];
    for (const row of indexRows(snapshot.identities, 'identities', divergences)) {
        const restored: Doc = {
            _id: oidRef(mintObjectIdHex('identities', row.id)),
            ...pick(row.doc, IDENTITY_ATTRIBUTE_KEYS),
        };
        const expiresAt = toExtendedDate(row.doc.expiresAt);
        if (expiresAt) restored.expiresAt = expiresAt;
        restoreTimestamps(restored, row, 'identities', divergences);
        identities.push(restored);
    }

    return {
        collections: {
            shops: sortByObjectId(shops),
            featureFlags: sortByObjectId(featureFlags),
            reviews: sortByObjectId(reviews),
            users: sortByObjectId(users),
            sessions: sortByObjectId(sessions),
            identities: sortByObjectId(identities),
        },
        divergences,
    };
};

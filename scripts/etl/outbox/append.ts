/**
 * PIPELINE-05 freeze-window write capture, append half: the transactional outbox primitives the
 * admin's Payload write paths adopt for the duration of the maintenance freeze.
 *
 * Design (same-session transactional outbox): the deployment topology — the dev/e2e
 * `MongoMemoryReplSet` (`packages/test-mongo/src/start.ts`) and the production Atlas replica set —
 * supports multi-document transactions, and Payload's `@payloadcms/db-mongodb` adapter already wraps
 * every write operation in one (the request's `ClientSession` is reachable as
 * `payload.db.sessions[req.transactionID]`). The outbox append therefore composes into the SAME
 * Mongo transaction as the write it captures: {@link appendOutboxEntry} REQUIRES the session — there
 * is deliberately no session-less overload — so the append commits or aborts atomically with the
 * wrapped write and an aborted write can never leave an orphan outbox row (pinned by
 * `append.test.ts` against a real replica set).
 *
 * Freeze-time wiring (see `./runbook.md` for the verbatim hook): the admin Payload app is the ONLY
 * live writer during the freeze, so a global `afterChange`/`afterDelete` hook pair added to every
 * collection captures the complete write surface. The hook resolves the request's session via
 * {@link resolveOutboxSession}, re-reads the row it just wrote IN the same session via
 * {@link captureOutboxUpsert} (read-your-own-write inside the transaction, so the snapshot is the
 * exact post-write Mongo state — never the API-shaped hook `doc`), and appends the entry. Version /
 * autosave rows (`_<slug>_versions`) are captured from the same hook with a second
 * {@link captureOutboxUpsert} call against the companion collection.
 *
 * This module is driver-agnostic on purpose: the structural {@link OutboxDb} surface is satisfied by
 * the real `mongodb` `Db`/`ClientSession` (and by mongoose's underlying connection), keeping the
 * scripts tree free of a Mongo dependency — the same stance as the rest of the ETL.
 */
import { coerceObjectId, type Doc } from '../transform/id-remap';

/**
 * The Mongo collection the freeze-window outbox lives in. Underscore-prefixed so it can never
 * collide with a Payload collection slug, and explicitly excluded from the drainer's snapshot
 * classification (`./drainer.ts`) so the outbox is never mistaken for source content.
 */
export const OUTBOX_COLLECTION = '_convex_outbox';

/** The two write shapes the freeze window produces. */
export type OutboxOperation = 'upsert' | 'delete';

/**
 * One captured freeze-window write. `doc` is the FULL post-write Mongo state of the row (read back
 * in-session), never a delta — that is what makes the drainer's replay idempotent and order-tolerant
 * within a row: applying the same entry twice, or an older entry before a newer one, converges to
 * the last-written state. For a `delete` the snapshot is `null`.
 */
export interface OutboxEntry {
    /** Source Mongo collection name (a Payload slug, or its `_<slug>_versions` companion). */
    collection: string;
    operation: OutboxOperation;
    /** The written row's `_id` hex — the drainer's upsert key, fed through the ETL id-remap. */
    legacyId: string;
    /** Full post-write row state for an upsert; `null` for a delete. */
    doc: Doc | null;
    /** Capture timestamp (epoch ms) — the drain-lag clock. */
    ts: number;
}

/**
 * The structural slice of a Mongo collection the outbox primitives need. The real `mongodb`
 * `Collection<Document>` satisfies it (both methods accept a superset of these options).
 */
export interface OutboxCollection<TSession> {
    insertOne(doc: Doc, options: { session: TSession }): Promise<unknown>;
    findOne(filter: Doc, options: { session: TSession; sort?: Record<string, 1 | -1> }): Promise<Doc | null>;
}

/** The structural slice of a Mongo `Db` the outbox primitives need. */
export interface OutboxDb<TSession> {
    collection(name: string): OutboxCollection<TSession>;
}

/**
 * Builds an outbox entry from already-resolved parts. Pure; the low-level constructor the capture
 * helpers and tests share.
 *
 * @param collection - Source collection name.
 * @param operation - The write shape.
 * @param legacyId - The written row's `_id` hex.
 * @param doc - Full post-write row state, or `null` for a delete.
 * @param ts - Capture timestamp (epoch ms).
 * @returns The outbox entry.
 */
export const buildOutboxEntry = (
    collection: string,
    operation: OutboxOperation,
    legacyId: string,
    doc: Doc | null,
    ts: number,
): OutboxEntry => ({ collection, operation, legacyId, doc, ts });

/**
 * Builds an upsert entry from a row snapshot, deriving `legacyId` from the snapshot's own `_id`.
 * Returns `null` when the snapshot carries no resolvable id (the ETL's null-return convention) so a
 * caller can refuse the write loudly instead of appending an unkeyed entry.
 *
 * @param collection - Source collection name.
 * @param doc - The full post-write row state.
 * @param ts - Capture timestamp (epoch ms).
 * @returns The entry, or `null` when the snapshot has no `_id`.
 */
export const buildOutboxUpsert = (collection: string, doc: Doc, ts: number): OutboxEntry | null => {
    const legacyId = coerceObjectId(doc._id);
    if (!legacyId) return null;
    return buildOutboxEntry(collection, 'upsert', legacyId, doc, ts);
};

/**
 * Appends one outbox entry INSIDE the caller's open transaction. The `session` parameter is
 * required by design — the append is structurally inseparable from the wrapped write: both commit
 * or abort together, so an aborted admin write leaves no orphan outbox row and a committed one is
 * never captured partially.
 *
 * @param db - The Mongo database handle (the SAME database the wrapped write targets).
 * @param session - The wrapped write's own `ClientSession` (from `payload.db.sessions[req.transactionID]`).
 * @param entry - The captured write.
 * @returns Resolves when the insert is staged on the transaction.
 */
export const appendOutboxEntry = async <TSession>(
    db: OutboxDb<TSession>,
    session: TSession,
    entry: OutboxEntry,
): Promise<void> => {
    await db.collection(OUTBOX_COLLECTION).insertOne({ ...entry }, { session });
};

/**
 * Captures one upsert by re-reading the freshly written row IN the caller's transaction
 * (read-your-own-write: the uncommitted post-write state is visible to its own session) and
 * appending the snapshot as an outbox entry. Reading back — rather than trusting the API-shaped
 * `doc` a Payload hook receives — guarantees the captured snapshot is byte-equivalent to what a
 * `mongoexport` of the committed row would later produce, which is the shape the drainer's
 * transforms are proven against. Returns the appended entry, or `null` when no row matched or the
 * row carries no resolvable `_id` (the caller must treat `null` as a capture failure and abort the
 * write — see the runbook's freeze contract).
 *
 * @param db - The Mongo database handle.
 * @param session - The wrapped write's own session.
 * @param collection - The collection the write landed in (`<slug>` or `_<slug>_versions`).
 * @param filter - Filter locating the written row (e.g. `{ _id }`, or `{ parent }` for the
 *   latest-version capture).
 * @param ts - Capture timestamp (epoch ms).
 * @param sort - Optional sort picking one row when the filter matches several (e.g.
 *   `{ updatedAt: -1 }` for the latest version row).
 * @returns The appended entry, or `null` when nothing matched / the row has no id.
 */
export const captureOutboxUpsert = async <TSession>(
    db: OutboxDb<TSession>,
    session: TSession,
    collection: string,
    filter: Doc,
    ts: number,
    sort?: Record<string, 1 | -1>,
): Promise<OutboxEntry | null> => {
    const row = await db.collection(collection).findOne(filter, sort ? { session, sort } : { session });
    if (!row) return null;
    const entry = buildOutboxUpsert(collection, row, ts);
    if (!entry) return null;
    await appendOutboxEntry(db, session, entry);
    return entry;
};

/**
 * Captures one delete inside the caller's transaction. The id is taken from the deleting
 * operation's own knowledge of the row (Payload's `afterDelete` hook receives the deleted `id`), so
 * no read-back is needed — the row is already gone within the transaction.
 *
 * @param db - The Mongo database handle.
 * @param session - The wrapped write's own session.
 * @param collection - The collection the delete targeted.
 * @param legacyId - The deleted row's `_id` hex.
 * @param ts - Capture timestamp (epoch ms).
 * @returns The appended entry.
 */
export const captureOutboxDelete = async <TSession>(
    db: OutboxDb<TSession>,
    session: TSession,
    collection: string,
    legacyId: string,
    ts: number,
): Promise<OutboxEntry> => {
    const entry = buildOutboxEntry(collection, 'delete', legacyId, null, ts);
    await appendOutboxEntry(db, session, entry);
    return entry;
};

/**
 * Resolves the live `ClientSession` of a Payload request from the adapter's session registry —
 * `payload.db.sessions[req.transactionID]` in `@payloadcms/db-mongodb`. Returns `null` when the
 * request runs outside a transaction (no `transactionID`, or the registry has no entry): per the
 * freeze contract the hook MUST then refuse the write (throwing in the admin app), because a
 * sessionless append would not be atomic with the write it claims to capture.
 *
 * @param adapter - The adapter slice exposing the session registry.
 * @param transactionID - The request's `req.transactionID`.
 * @returns The request's open session, or `null` when the write is not transactional.
 */
export const resolveOutboxSession = <TSession>(
    adapter: { sessions: Record<string | number, TSession> },
    transactionID: string | number | undefined,
): TSession | null => {
    if (transactionID === undefined) return null;
    return adapter.sessions[transactionID] ?? null;
};

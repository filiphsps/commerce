/**
 * PIPELINE-05 append-half contract. The original proof ran against a REAL single-node replica set
 * booted by the in-process Mongo harness; that harness died with the Mongo teardown (the recorded
 * green run lives in `.specs/2026-05-30-convex-migration/`), and the repo deliberately carries no
 * Mongo runtime anymore. The suite therefore drives the same structural `OutboxDb` surface through
 * a session-staging fake that mirrors the exact slice of driver semantics `append.ts` relies on:
 * writes staged on a session are visible to that session's own reads (read-your-own-write) and
 * invisible elsewhere until commit, and an abort discards every staged write. At prod-cutover time
 * the appends run against Atlas, whose real transactions provide those same guarantees.
 */
import { describe, expect, it } from 'vitest';

import type { Doc } from '../transform/id-remap';
import {
    appendOutboxEntry,
    buildOutboxEntry,
    buildOutboxUpsert,
    captureOutboxDelete,
    captureOutboxUpsert,
    OUTBOX_COLLECTION,
    resolveOutboxSession,
} from './append';

/** One write staged on an open fake transaction, held back until commit. */
interface StagedWrite {
    collection: string;
    doc: Doc;
}

/**
 * Session double mirroring the driver's `ClientSession` lifecycle: inserts stage onto the session,
 * commit publishes them to the database, abort (or ending an uncommitted session) discards them.
 */
class FakeSession {
    staged: StagedWrite[] = [];

    /**
     * @param db - The owning database the staged writes publish into on commit.
     */
    constructor(private readonly db: FakeOutboxDb) {}

    /** Opens a fresh transaction, dropping any leftover staged writes. */
    startTransaction(): void {
        this.staged = [];
    }

    /**
     * Publishes every staged write to the database atomically — the all-or-nothing half the real
     * transaction provides.
     *
     * @returns Resolves once all staged writes are committed.
     */
    async commitTransaction(): Promise<void> {
        for (const write of this.staged) this.db.publish(write);
        this.staged = [];
    }

    /**
     * Discards every staged write — nothing reaches the database.
     *
     * @returns Resolves once the staging buffer is cleared.
     */
    async abortTransaction(): Promise<void> {
        this.staged = [];
    }

    /**
     * Ends the session; an uncommitted transaction is discarded, matching driver behavior.
     *
     * @returns Resolves once the staging buffer is cleared.
     */
    async endSession(): Promise<void> {
        this.staged = [];
    }
}

/** Filter match: every filter key must strictly equal the candidate row's value. */
const matches = (doc: Doc, filter: Doc): boolean => Object.entries(filter).every(([key, value]) => doc[key] === value);

/**
 * In-memory database double satisfying `append.ts`'s structural `OutboxDb<FakeSession>` plus the
 * committed-state read helpers the assertions use (`countDocuments`/`find` see ONLY committed
 * rows, exactly like an out-of-session read against the real driver).
 */
class FakeOutboxDb {
    private readonly committed = new Map<string, Doc[]>();

    /** @returns A fresh session bound to this database. */
    startSession(): FakeSession {
        return new FakeSession(this);
    }

    /**
     * Lands one staged write in committed state. Called only from {@link FakeSession.commitTransaction}.
     *
     * @param write - The staged write to publish.
     */
    publish(write: StagedWrite): void {
        this.rows(write.collection).push(write.doc);
    }

    /**
     * @param name - Collection name.
     * @returns The committed-row store for `name`, created on first access.
     */
    private rows(name: string): Doc[] {
        let rows = this.committed.get(name);
        if (!rows) {
            rows = [];
            this.committed.set(name, rows);
        }
        return rows;
    }

    /**
     * @param name - Collection name.
     * @returns The structural collection surface: session-staged writes + session-visible reads,
     *   plus committed-only assertion helpers.
     */
    collection(name: string) {
        return {
            /**
             * Stages an insert on the session. Stores a copy so a later read-back observes the
             * stored row state, never the caller's live object.
             *
             * @param doc - The row to insert.
             * @param options - The owning session.
             * @returns Resolves once staged.
             */
            insertOne: async (doc: Doc, options: { session: FakeSession }): Promise<unknown> => {
                options.session.staged.push({ collection: name, doc: { ...doc } });
                return {};
            },
            /**
             * In-session read: committed rows plus the session's own staged rows
             * (read-your-own-write), optionally sorted.
             *
             * @param filter - Equality filter.
             * @param options - The session and an optional sort.
             * @returns A copy of the first matching row, or `null`.
             */
            findOne: async (
                filter: Doc,
                options: { session: FakeSession; sort?: Record<string, 1 | -1> },
            ): Promise<Doc | null> => {
                const visible = [
                    ...this.rows(name),
                    ...options.session.staged.filter((write) => write.collection === name).map((write) => write.doc),
                ].filter((doc) => matches(doc, filter));
                if (options.sort) {
                    for (const [key, direction] of Object.entries(options.sort)) {
                        visible.sort((a, b) => (Number(a[key]) - Number(b[key])) * direction);
                    }
                }
                const [first] = visible;
                return first ? { ...first } : null;
            },
            /**
             * Committed-only count — what any other session would observe.
             *
             * @param filter - Equality filter; defaults to match-all.
             * @returns The number of committed matching rows.
             */
            countDocuments: async (filter: Doc = {}): Promise<number> =>
                this.rows(name).filter((doc) => matches(doc, filter)).length,
            /**
             * Committed-only query — what any other session would observe.
             *
             * @param filter - Equality filter; defaults to match-all.
             * @returns A cursor-shaped object over committed matching rows.
             */
            find: (filter: Doc = {}) => ({
                toArray: async (): Promise<Doc[]> => this.rows(name).filter((doc) => matches(doc, filter)),
            }),
        };
    }
}

/**
 * Runs `work` inside a fresh transaction, committing or aborting per `outcome`, always ending the
 * session.
 *
 * @param db - The fake database.
 * @param outcome - Whether to commit or abort after `work` resolves.
 * @param work - The transactional writes, given the open session.
 * @returns Resolves when the transaction has been finalized.
 */
const inTransaction = async (
    db: FakeOutboxDb,
    outcome: 'commit' | 'abort',
    work: (session: FakeSession) => Promise<void>,
): Promise<void> => {
    const session = db.startSession();
    try {
        session.startTransaction();
        await work(session);
        if (outcome === 'commit') await session.commitTransaction();
        else await session.abortTransaction();
    } finally {
        await session.endSession();
    }
};

describe('PIPELINE-05 transactional outbox append (session-staging double)', () => {
    it('commits the captured write and its outbox row atomically', async () => {
        const db = new FakeOutboxDb();
        const pages = db.collection('pages');
        const outbox = db.collection(OUTBOX_COLLECTION);
        const page: Doc = { _id: 'committed-page-1', title: 'Hello', updatedAt: 1717000000000 };

        await inTransaction(db, 'commit', async (session) => {
            await pages.insertOne(page, { session });
            const entry = await captureOutboxUpsert(db, session, 'pages', { _id: page._id }, 1717000000001);
            expect(entry).not.toBeNull();
            expect(entry?.legacyId).toBe('committed-page-1');
        });

        expect(await pages.countDocuments({ _id: 'committed-page-1' })).toBe(1);
        const rows = await outbox.find({ legacyId: 'committed-page-1' }).toArray();
        expect(rows).toHaveLength(1);
        const [row] = rows;
        expect(row?.collection).toBe('pages');
        expect(row?.operation).toBe('upsert');
        // The snapshot is the read-back row state, not the caller's in-memory object.
        expect((row?.doc as Doc).title).toBe('Hello');
    });

    it('aborting the wrapped write leaves NO orphan outbox row (criterion 1)', async () => {
        const db = new FakeOutboxDb();
        const pages = db.collection('pages');
        const outbox = db.collection(OUTBOX_COLLECTION);
        const page: Doc = { _id: 'aborted-page-1', title: 'Never lands', updatedAt: 1717000000002 };

        await inTransaction(db, 'abort', async (session) => {
            await pages.insertOne(page, { session });
            // Read-your-own-write: the uncommitted row IS visible to its own session…
            const entry = await captureOutboxUpsert(db, session, 'pages', { _id: page._id }, 1717000000003);
            expect(entry).not.toBeNull();
        });

        // …but the abort rolls back the write AND the append together: no doc, no orphan entry.
        expect(await pages.countDocuments({ _id: 'aborted-page-1' })).toBe(0);
        expect(await outbox.countDocuments({ legacyId: 'aborted-page-1' })).toBe(0);
    });

    it('captures version rows via in-session sorted read-back, and deletes without read-back', async () => {
        const db = new FakeOutboxDb();
        const versions = db.collection('_pages_versions');
        const outbox = db.collection(OUTBOX_COLLECTION);

        await inTransaction(db, 'commit', async (session) => {
            await versions.insertOne({ _id: 'v1', parent: 'doc-9', updatedAt: 100 }, { session });
            await versions.insertOne({ _id: 'v2', parent: 'doc-9', updatedAt: 200 }, { session });
            const entry = await captureOutboxUpsert(
                db,
                session,
                '_pages_versions',
                { parent: 'doc-9' },
                1717000000004,
                { updatedAt: -1 },
            );
            expect(entry?.legacyId).toBe('v2');
            await captureOutboxDelete(db, session, 'pages', 'doc-gone', 1717000000005);
        });

        const versionRows = await outbox.find({ collection: '_pages_versions' }).toArray();
        expect(versionRows.map((row) => row.legacyId)).toEqual(['v2']);
        const deleteRows = await outbox.find({ legacyId: 'doc-gone' }).toArray();
        expect(deleteRows).toHaveLength(1);
        expect(deleteRows[0]?.operation).toBe('delete');
        expect(deleteRows[0]?.doc).toBeNull();
    });

    it('aborted multi-capture (doc + version) rolls back every outbox row', async () => {
        const db = new FakeOutboxDb();
        const articles = db.collection('articles');
        const versions = db.collection('_articles_versions');
        const outbox = db.collection(OUTBOX_COLLECTION);

        await inTransaction(db, 'abort', async (session) => {
            await articles.insertOne({ _id: 'a1', title: 'draft' }, { session });
            await versions.insertOne({ _id: 'av1', parent: 'a1', updatedAt: 1 }, { session });
            await captureOutboxUpsert(db, session, 'articles', { _id: 'a1' }, 1);
            await captureOutboxUpsert(db, session, '_articles_versions', { parent: 'a1' }, 2, { updatedAt: -1 });
        });

        expect(await articles.countDocuments()).toBe(0);
        expect(await versions.countDocuments()).toBe(0);
        expect(await outbox.countDocuments({ collection: 'articles' })).toBe(0);
        expect(await outbox.countDocuments({ collection: '_articles_versions' })).toBe(0);
    });

    it('appendOutboxEntry stores the entry fields verbatim', async () => {
        const db = new FakeOutboxDb();
        const outbox = db.collection(OUTBOX_COLLECTION);
        await inTransaction(db, 'commit', async (session) => {
            await appendOutboxEntry(
                db,
                session,
                buildOutboxEntry('reviews', 'upsert', 'review-7', { _id: 'review-7', rating: 5 }, 42),
            );
        });
        const rows = await outbox.find({ legacyId: 'review-7' }).toArray();
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ collection: 'reviews', operation: 'upsert', ts: 42 });
    });
});

describe('outbox append pure helpers', () => {
    it('buildOutboxUpsert derives legacyId from the snapshot _id (extended-JSON tolerant)', () => {
        const entry = buildOutboxUpsert('shops', { _id: { $oid: '6630f1a2b3c4d5e6f7a8b9d1' }, name: 'x' }, 10);
        expect(entry?.legacyId).toBe('6630f1a2b3c4d5e6f7a8b9d1');
        expect(entry?.operation).toBe('upsert');
    });

    it('buildOutboxUpsert refuses a snapshot without an id (null-return)', () => {
        expect(buildOutboxUpsert('shops', { name: 'no id' }, 10)).toBeNull();
    });

    it('resolveOutboxSession resolves the Payload adapter registry and refuses non-transactional requests', () => {
        const session = { tag: 'live' };
        const adapter = { sessions: { 'tx-1': session } };
        expect(resolveOutboxSession(adapter, 'tx-1')).toBe(session);
        expect(resolveOutboxSession(adapter, 'tx-2')).toBeNull();
        expect(resolveOutboxSession(adapter, undefined)).toBeNull();
    });
});

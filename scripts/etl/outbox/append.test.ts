/**
 * PIPELINE-05 append-half proof against a REAL single-node Mongo replica set — the same
 * `MongoMemoryReplSet` topology `pnpm dev`/e2e run on (and the same transaction support Atlas
 * provides in production), booted through the committed `packages/test-mongo` harness. The suite
 * pins the criterion-1 contract: the outbox append rides the SAME transaction as the write it
 * captures, so an aborted write leaves NO orphan outbox row and a committed one captures exactly
 * once.
 *
 * The `mongodb` driver is loaded through `mongodb-memory-server`'s own dependency edge (resolved
 * from the `packages/test-mongo` install, where the harness already guarantees it exists) because
 * the scripts tree deliberately carries no Mongo dependency of its own; the driver surface is typed
 * structurally — the same stance `append.ts` takes.
 */
import { createRequire } from 'node:module';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { startMongo, type StartedMongo } from '../../../packages/test-mongo/src/start';
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

/** Structural slice of the driver's `ClientSession` the suite drives transactions through. */
interface TestSession {
    startTransaction(): void;
    commitTransaction(): Promise<unknown>;
    abortTransaction(): Promise<unknown>;
    endSession(): Promise<unknown>;
}

/** Structural slice of the driver's `Collection`. */
interface TestCollection {
    insertOne(doc: Doc, options: { session: TestSession }): Promise<unknown>;
    findOne(filter: Doc, options: { session: TestSession; sort?: Record<string, 1 | -1> }): Promise<Doc | null>;
    countDocuments(filter?: Doc): Promise<number>;
    find(filter?: Doc): { toArray(): Promise<Doc[]> };
    deleteMany(filter?: Doc): Promise<unknown>;
}

/** Structural slice of the driver's `Db`. */
interface TestDb {
    collection(name: string): TestCollection;
}

/** Structural slice of the driver's `MongoClient`. */
interface TestClient {
    connect(): Promise<unknown>;
    db(name: string): TestDb;
    startSession(): TestSession;
    close(): Promise<unknown>;
}

/**
 * Loads the real `mongodb` driver via `mongodb-memory-server`'s dependency edge, resolved from the
 * committed test-mongo harness install.
 *
 * @returns The driver's `MongoClient` constructor, structurally typed.
 */
const loadMongoClient = (): (new (uri: string) => TestClient) => {
    const requireFromHarness = createRequire(new URL('../../../packages/test-mongo/src/start.ts', import.meta.url));
    const requireFromMms = createRequire(requireFromHarness.resolve('mongodb-memory-server/package.json'));
    const driver = requireFromMms('mongodb') as { MongoClient: new (uri: string) => TestClient };
    return driver.MongoClient;
};

/**
 * Runs `work` inside a fresh transaction on `client`, committing or aborting per `outcome`, always
 * ending the session.
 *
 * @param client - The connected Mongo client.
 * @param outcome - Whether to commit or abort after `work` resolves.
 * @param work - The transactional writes, given the open session.
 * @returns Resolves when the transaction has been finalized.
 */
const inTransaction = async (
    client: TestClient,
    outcome: 'commit' | 'abort',
    work: (session: TestSession) => Promise<void>,
): Promise<void> => {
    const session = client.startSession();
    try {
        session.startTransaction();
        await work(session);
        if (outcome === 'commit') await session.commitTransaction();
        else await session.abortTransaction();
    } finally {
        await session.endSession();
    }
};

describe('PIPELINE-05 transactional outbox append (real replica set)', () => {
    let mongo: StartedMongo;
    let client: TestClient;
    let db: TestDb;

    beforeAll(async () => {
        mongo = await startMongo();
        client = new (loadMongoClient())(mongo.uri);
        await client.connect();
        db = client.db('outbox-append-suite');
    }, 240_000);

    afterAll(async () => {
        await client?.close();
        await mongo?.stop();
    }, 120_000);

    it('commits the captured write and its outbox row atomically', async () => {
        const pages = db.collection('pages');
        const outbox = db.collection(OUTBOX_COLLECTION);
        const page: Doc = { _id: 'committed-page-1', title: 'Hello', updatedAt: 1717000000000 };

        await inTransaction(client, 'commit', async (session) => {
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
    }, 120_000);

    it('aborting the wrapped write leaves NO orphan outbox row (criterion 1)', async () => {
        const pages = db.collection('pages');
        const outbox = db.collection(OUTBOX_COLLECTION);
        const page: Doc = { _id: 'aborted-page-1', title: 'Never lands', updatedAt: 1717000000002 };

        await inTransaction(client, 'abort', async (session) => {
            await pages.insertOne(page, { session });
            // Read-your-own-write: the uncommitted row IS visible to its own session…
            const entry = await captureOutboxUpsert(db, session, 'pages', { _id: page._id }, 1717000000003);
            expect(entry).not.toBeNull();
        });

        // …but the abort rolls back the write AND the append together: no doc, no orphan entry.
        expect(await pages.countDocuments({ _id: 'aborted-page-1' })).toBe(0);
        expect(await outbox.countDocuments({ legacyId: 'aborted-page-1' })).toBe(0);
    }, 120_000);

    it('captures version rows via in-session sorted read-back, and deletes without read-back', async () => {
        const versions = db.collection('_pages_versions');
        const outbox = db.collection(OUTBOX_COLLECTION);

        await inTransaction(client, 'commit', async (session) => {
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
    }, 120_000);

    it('aborted multi-capture (doc + version) rolls back every outbox row', async () => {
        const articles = db.collection('articles');
        const versions = db.collection('_articles_versions');
        const outbox = db.collection(OUTBOX_COLLECTION);

        await inTransaction(client, 'abort', async (session) => {
            await articles.insertOne({ _id: 'a1', title: 'draft' }, { session });
            await versions.insertOne({ _id: 'av1', parent: 'a1', updatedAt: 1 }, { session });
            await captureOutboxUpsert(db, session, 'articles', { _id: 'a1' }, 1);
            await captureOutboxUpsert(db, session, '_articles_versions', { parent: 'a1' }, 2, { updatedAt: -1 });
        });

        expect(await articles.countDocuments()).toBe(0);
        expect(await versions.countDocuments()).toBe(0);
        expect(await outbox.countDocuments({ collection: 'articles' })).toBe(0);
        expect(await outbox.countDocuments({ collection: '_articles_versions' })).toBe(0);
    }, 120_000);

    it('appendOutboxEntry stores the entry fields verbatim', async () => {
        const outbox = db.collection(OUTBOX_COLLECTION);
        await inTransaction(client, 'commit', async (session) => {
            await appendOutboxEntry(
                db,
                session,
                buildOutboxEntry('reviews', 'upsert', 'review-7', { _id: 'review-7', rating: 5 }, 42),
            );
        });
        const rows = await outbox.find({ legacyId: 'review-7' }).toArray();
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ collection: 'reviews', operation: 'upsert', ts: 42 });
    }, 120_000);
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

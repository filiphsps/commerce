import { MongoMemoryReplSet } from 'mongodb-memory-server';

export interface StartMongoOptions {
    /** When set, mongod persists to this directory and survives `.stop()`. */
    dbPath?: string;
    /** Fixed port. Useful with `dbPath` so re-attaches hit the same URI. */
    port?: number;
}

export interface StartedMongo {
    uri: string;
    stop: () => Promise<void>;
}

export async function startMongo(opts: StartMongoOptions = {}): Promise<StartedMongo> {
    const hasInstanceOverride = opts.dbPath !== undefined || opts.port !== undefined;

    // Payload wraps every write in a multi-doc transaction. MongoDB's default
    // `maxTransactionLockRequestTimeoutMillis` of 5ms is way too aggressive
    // for the bursty catalog writes Payload makes against a fresh DB
    // (`payload-preferences`, the multi-tenant plugin's setup, etc), so the
    // replSet rejects them with `LockTimeout`. Bumping the parameter to
    // 5000ms (5s) is the upstream-recommended fix and matches what real Atlas
    // clusters get. We do it via `args` on every node so the setting is
    // active before any client connects.
    const sharedArgs = ['--setParameter', 'maxTransactionLockRequestTimeoutMillis=5000'];
    const replSet = await MongoMemoryReplSet.create({
        replSet: { count: 1, storageEngine: 'wiredTiger' },
        binary: { version: process.env.MONGOMS_VERSION ?? '8.0.4' },
        instanceOpts: hasInstanceOverride
            ? [{ dbPath: opts.dbPath, port: opts.port, args: sharedArgs }]
            : [{ args: sharedArgs }],
    });

    const uri = replSet.getUri();

    return {
        uri,
        stop: async () => {
            // doCleanup: false preserves the dbPath on disk for the next run.
            await replSet.stop({ doCleanup: !opts.dbPath });
        },
    };
}

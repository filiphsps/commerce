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
    const replSet = await MongoMemoryReplSet.create({
        replSet: { count: 1, storageEngine: 'wiredTiger' },
        binary: { version: process.env.MONGOMS_VERSION ?? '8.0.4' },
        instanceOpts: opts.dbPath
            ? [{ dbPath: opts.dbPath, port: opts.port, storageEngine: 'wiredTiger' }]
            : opts.port
              ? [{ port: opts.port }]
              : undefined,
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

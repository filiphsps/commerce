import { MongoMemoryReplSet } from 'mongodb-memory-server';

/**
 * Options for {@link startMongo}. Both fields are optional; omitting them
 * starts an ephemeral in-memory replica-set that is torn down on `stop()`.
 *
 * @example
 * ```ts
 * // Ephemeral — for unit tests:
 * const mongo = await startMongo();
 *
 * // Persistent — for pnpm dev:
 * const mongo = await startMongo({ dbPath: '.mongo-dev', port: 27018 });
 * ```
 */
export interface StartMongoOptions {
    /** When set, mongod persists to this directory and survives `.stop()`. */
    dbPath?: string;
    /** Fixed port. Useful with `dbPath` so re-attaches hit the same URI. */
    port?: number;
}

/**
 * Handle returned by {@link startMongo}. Carries the replica-set connection
 * URI and a `stop()` method that cleanly shuts down the instance, optionally
 * removing the on-disk data directory.
 *
 * @example
 * ```ts
 * const { uri, stop } = await startMongo();
 * // pass uri to mongoose.connect or MongoClient
 * await stop();
 * ```
 */
export interface StartedMongo {
    uri: string;
    stop: () => Promise<void>;
}

// Module-level registry of every MongoMemoryReplSet this process owns.
// We need this so the signal/exit handlers below can reach every running
// replSet even when the test that owns it has been killed mid-flight
// (vitest worker death, Ctrl-C, uncaught rejection, etc).
const activeReplSets = new Set<MongoMemoryReplSet>();
const replSetCleanupFlags = new WeakMap<MongoMemoryReplSet, boolean>();

// Vitest workers occasionally die without running afterAll — leaving orphan
// mongod processes and gigabyte-sized `mongo-mem-*` temp dirs behind, which
// is what freezes the user's machine. Node only guarantees signal + exit
// hooks fire when the runtime is shutting down, so we route every plausible
// shutdown path through a best-effort async stop, with a synchronous SIGKILL
// fallback for the hard-exit case where async work is no longer possible.
let handlersInstalled = false;

/**
 * Registers signal and exit handlers so every `MongoMemoryReplSet` tracked in
 * `activeReplSets` is stopped when the current process exits — preventing
 * orphan mongod processes and leftover temp directories when vitest workers
 * crash or uncaught exceptions bypass `afterAll` hooks.
 */
function installShutdownHandlers(): void {
    if (handlersInstalled) return;
    handlersInstalled = true;

    const asyncStopAll = async (): Promise<void> => {
        const targets = Array.from(activeReplSets);
        await Promise.allSettled(
            targets.map(async (replSet) => {
                try {
                    await replSet.stop({ doCleanup: replSetCleanupFlags.get(replSet) ?? true });
                } finally {
                    activeReplSets.delete(replSet);
                }
            }),
        );
    };

    const syncKillAll = (): void => {
        for (const replSet of activeReplSets) {
            for (const server of replSet.servers) {
                const pid = server.instanceInfo?.instance.mongodProcess?.pid;
                if (typeof pid === 'number') {
                    try {
                        process.kill(pid, 'SIGKILL');
                    } catch {
                        // Process already gone, nothing to do.
                    }
                }
                const killerPid = server.instanceInfo?.instance.killerProcess?.pid;
                if (typeof killerPid === 'number') {
                    try {
                        process.kill(killerPid, 'SIGKILL');
                    } catch {
                        // Process already gone, nothing to do.
                    }
                }
            }
        }
    };

    const onSignal = (signum: number): void => {
        void asyncStopAll().finally(() => {
            process.exit(128 + signum);
        });
    };

    process.once('SIGINT', () => onSignal(2));
    process.once('SIGTERM', () => onSignal(15));
    process.once('SIGHUP', () => onSignal(1));

    process.on('beforeExit', () => {
        if (activeReplSets.size === 0) return;
        void asyncStopAll();
    });

    process.on('exit', () => {
        if (activeReplSets.size === 0) return;
        syncKillAll();
    });

    process.on('uncaughtException', (err) => {
        process.stderr.write(`[test-mongo] uncaughtException — stopping replSets: ${err?.stack ?? err}\n`);
        void asyncStopAll().finally(() => {
            process.exit(1);
        });
    });

    process.on('unhandledRejection', (reason) => {
        process.stderr.write(`[test-mongo] unhandledRejection — stopping replSets: ${String(reason)}\n`);
        void asyncStopAll().finally(() => {
            process.exit(1);
        });
    });
}

/**
 * Starts a single-node `MongoMemoryReplSet` backed by WiredTiger and returns
 * its connection URI plus a `stop()` handle. Pass `dbPath` and `port` to make
 * the instance persistent across restarts; omit them for an ephemeral test replica-set.
 *
 * @param opts - Optional path and port overrides. When `dbPath` is set, the
 *   data directory is preserved on `stop()` so the next start reuses it.
 * @returns A `StartedMongo` with the replica-set URI and a graceful stop handle.
 * @example
 * ```ts
 * const { uri, stop } = await startMongo();
 * try {
 *     await mongoose.connect(uri);
 *     // run tests
 * } finally {
 *     await stop();
 * }
 * ```
 */
export async function startMongo(opts: StartMongoOptions = {}): Promise<StartedMongo> {
    installShutdownHandlers();

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
    const binaryVersion = process.env.MONGOMS_VERSION ?? '8.0.4';
    console.info(`[test-mongo] booting MongoMemoryReplSet (mongod ${binaryVersion}, WiredTiger, count=1)`);
    const replSetStartedAt = Date.now();
    const replSet = await MongoMemoryReplSet.create({
        replSet: { count: 1, storageEngine: 'wiredTiger' },
        binary: { version: binaryVersion },
        instanceOpts: hasInstanceOverride
            ? [{ dbPath: opts.dbPath, port: opts.port, args: sharedArgs }]
            : [{ args: sharedArgs }],
    });
    console.info(`[test-mongo] MongoMemoryReplSet ready in ${Date.now() - replSetStartedAt}ms`);

    const doCleanup = !opts.dbPath;
    activeReplSets.add(replSet);
    replSetCleanupFlags.set(replSet, doCleanup);

    const uri = replSet.getUri();

    let stopped = false;
    return {
        uri,
        stop: async () => {
            if (stopped) return;
            stopped = true;
            try {
                // doCleanup: false preserves the dbPath on disk for the next run.
                await replSet.stop({ doCleanup });
            } finally {
                activeReplSets.delete(replSet);
            }
        },
    };
}

import { describe, expect, it, vi } from 'vitest';
import type { AdapterCtx, CacheAdapter } from './adapter';
import { consoleLogger } from './adapter';
import { defineCache } from './schema';

const ctx: AdapterCtx = {
    schema: defineCache({ namespace: 'contract', entities: {} }).schema,
    logger: consoleLogger,
};

/**
 * Configuration passed to `runAdapterContract`; declares how to create and tear down the adapter
 * under test and which optional protocol features the adapter supports.
 *
 * @example
 * ```ts
 * runAdapterContract({
 *     name: 'memory',
 *     create: () => memoryAdapter(),
 *     supportsTtl: true,
 *     supportsStalenessGuard: true,
 * });
 * ```
 */
export interface ContractTestOptions {
    /** Label used in the Vitest `describe` block to identify the adapter under test. */
    name: string;
    /** Factory that returns a fresh adapter instance for each individual test case. */
    create: () => Promise<CacheAdapter> | CacheAdapter;
    /** Optional cleanup hook called after each test to release adapter resources such as connections. */
    teardown?: (a: CacheAdapter) => Promise<void> | void;
    /** Set to `true` if the adapter enforces TTL-based expiry; enables the TTL test suite. */
    supportsTtl?: boolean;
    /** Set to `true` if the adapter honors `WriteOpts.writeIfNewerThan`; enables the staleness-guard suite. */
    supportsStalenessGuard?: boolean;
}

/**
 * Registers a Vitest `describe` block that verifies an adapter implementation satisfies the
 * `CacheAdapter` contract; call this inside each adapter package's own test suite to catch
 * behavioral regressions without duplicating test logic.
 *
 * @param opts - Test configuration; controls which adapter to test and which optional cases to run.
 * @example
 * ```ts
 * import { runAdapterContract } from '@tagtree/core/contract-tests';
 * import { memoryAdapter } from '@tagtree/core';
 *
 * runAdapterContract({
 *     name: 'memory',
 *     create: () => memoryAdapter(),
 *     supportsTtl: true,
 *     supportsStalenessGuard: true,
 * });
 * ```
 */
export function runAdapterContract(opts: ContractTestOptions): void {
    describe(`adapter contract: ${opts.name}`, () => {
        const setup = async () => {
            const a = await opts.create();
            return a;
        };

        it('returns undefined for an unknown key', async () => {
            const a = await setup();
            expect(await a.read('missing', ctx)).toBeUndefined();
            await opts.teardown?.(a);
        });

        it('round-trips write → read', async () => {
            const a = await setup();
            await a.write('k1', 'v1', ['tag-a'], {}, ctx);
            const r = await a.read('k1', ctx);
            expect(r?.value).toBe('v1');
            await opts.teardown?.(a);
        });

        it('invalidates by tag', async () => {
            const a = await setup();
            await a.write('k1', 'v1', ['tag-a'], {}, ctx);
            await a.invalidate(['tag-a'], ctx);
            expect(await a.read('k1', ctx)).toBeUndefined();
            await opts.teardown?.(a);
        });

        it('handles concurrent writes without losing the tag index', async () => {
            const a = await setup();
            await Promise.all([
                a.write('k1', 1, ['shared'], {}, ctx),
                a.write('k2', 2, ['shared'], {}, ctx),
                a.write('k3', 3, ['shared'], {}, ctx),
            ]);
            await a.invalidate(['shared'], ctx);
            expect(await a.read('k1', ctx)).toBeUndefined();
            expect(await a.read('k2', ctx)).toBeUndefined();
            expect(await a.read('k3', ctx)).toBeUndefined();
            await opts.teardown?.(a);
        });

        if (opts.supportsTtl) {
            it('expires entries after ttl', async () => {
                vi.useFakeTimers();
                const a = await setup();
                await a.write('k1', 'v1', [], { ttl: 1 }, ctx);
                vi.advanceTimersByTime(2_000);
                expect(await a.read('k1', ctx)).toBeUndefined();
                vi.useRealTimers();
                await opts.teardown?.(a);
            });
        }

        if (opts.supportsStalenessGuard) {
            it('drops stale writes via writeIfNewerThan', async () => {
                const a = await setup();
                await a.write('k1', 'fresh', ['t1'], {}, ctx);
                await a.invalidate(['t1'], ctx);
                const oldTs = Date.now() - 5_000;
                await a.write('k1', 'stale', ['t1'], { writeIfNewerThan: oldTs }, ctx);
                expect(await a.read('k1', ctx)).toBeUndefined();
                await opts.teardown?.(a);
            });
        }
    });
}

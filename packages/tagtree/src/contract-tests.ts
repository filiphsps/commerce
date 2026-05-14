import { describe, expect, it, vi } from 'vitest';
import type { CacheAdapter, AdapterCtx } from './adapter';
import { consoleLogger } from './adapter';
import { defineCache } from './schema';

const ctx: AdapterCtx = {
	schema: defineCache({ namespace: 'contract', entities: {} }).schema,
	logger: consoleLogger,
};

export interface ContractTestOptions {
	name: string;
	create: () => Promise<CacheAdapter> | CacheAdapter;
	teardown?: (a: CacheAdapter) => Promise<void> | void;
	supportsTtl?: boolean;
	supportsStalenessGuard?: boolean;
}

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

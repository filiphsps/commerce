import { beforeEach, describe, expect, it, vi } from 'vitest';
import { memoryAdapter } from '../src/memory-adapter';
import { consoleLogger, type AdapterCtx, type CacheAdapter } from '../src/adapter';
import { defineCache } from '../src/schema';

const schema = defineCache({ namespace: 'test', entities: { thing: {} } }).schema;
const ctx: AdapterCtx = { schema, logger: consoleLogger };

describe('memoryAdapter', () => {
	let a: CacheAdapter;
	beforeEach(() => {
		a = memoryAdapter({ maxEntries: 100 });
	});

	it('returns undefined for an unknown key', async () => {
		await expect(a.read('missing', ctx)).resolves.toBeUndefined();
	});

	it('returns the written value', async () => {
		await a.write('k1', 'v1', ['tag-a'], {}, ctx);
		const result = await a.read('k1', ctx);
		expect(result).toEqual({ value: 'v1', tags: ['tag-a'] });
	});

	it('invalidates entries by tag', async () => {
		await a.write('k1', 'v1', ['tag-a', 'tag-shared'], {}, ctx);
		await a.write('k2', 'v2', ['tag-b', 'tag-shared'], {}, ctx);

		await a.invalidate(['tag-a'], ctx);
		expect(await a.read('k1', ctx)).toBeUndefined();
		expect(await a.read('k2', ctx)).toEqual({ value: 'v2', tags: ['tag-b', 'tag-shared'] });

		await a.invalidate(['tag-shared'], ctx);
		expect(await a.read('k2', ctx)).toBeUndefined();
	});

	it('expires entries after ttl', async () => {
		vi.useFakeTimers();
		await a.write('k1', 'v1', [], { ttl: 60 }, ctx);
		expect(await a.read('k1', ctx)).toEqual({ value: 'v1', tags: [] });
		vi.advanceTimersByTime(61_000);
		expect(await a.read('k1', ctx)).toBeUndefined();
		vi.useRealTimers();
	});

	it('honors writeIfNewerThan — drops stale writes', async () => {
		await a.write('k1', 'fresh', ['t1'], {}, ctx);
		await a.invalidate(['t1'], ctx);

		// Simulate a fetcher that started before the invalidation
		// and tries to write a stale value with an older timestamp.
		const olderTs = Date.now() - 5_000;
		await a.write('k1', 'stale', ['t1'], { writeIfNewerThan: olderTs }, ctx);

		expect(await a.read('k1', ctx)).toBeUndefined();
	});

	it('evicts oldest entry when maxEntries is exceeded', async () => {
		const small = memoryAdapter({ maxEntries: 2 });
		await small.write('k1', 1, [], {}, ctx);
		await small.write('k2', 2, [], {}, ctx);
		await small.write('k3', 3, [], {}, ctx);
		expect(await small.read('k1', ctx)).toBeUndefined();
		expect(await small.read('k2', ctx)).toEqual({ value: 2, tags: [] });
		expect(await small.read('k3', ctx)).toEqual({ value: 3, tags: [] });
	});
});

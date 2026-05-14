import { describe, expect, it, vi } from 'vitest';
import { nextAdapter } from '../src/next-adapter';
import { consoleLogger, defineCache, type AdapterCtx } from 'tagtree';

const revalidateTagMock = vi.fn();
const unstableCacheMock = vi.fn();
vi.mock('next/cache', () => ({
	revalidateTag: (...args: unknown[]) => revalidateTagMock(...args),
	unstable_cache: (...args: unknown[]) => unstableCacheMock(...args),
}));

const ctx: AdapterCtx = {
	schema: defineCache({ namespace: 'shopify', entities: {} }).schema,
	logger: consoleLogger,
};

describe('nextAdapter', () => {
	it('wrap delegates to unstable_cache with key + tags + revalidate', async () => {
		const fetcher = vi.fn().mockResolvedValue('value');
		const wrapped = vi.fn().mockResolvedValue('value');
		unstableCacheMock.mockReturnValue(wrapped);

		const a = nextAdapter();
		const result = await a.wrap!('the-key', fetcher, ['t1', 't2'], { ttl: 60 }, ctx);

		expect(unstableCacheMock).toHaveBeenCalledWith(
			fetcher,
			['the-key'],
			{ tags: ['t1', 't2'], revalidate: 60 },
		);
		expect(result).toBe('value');
	});

	it('invalidate calls revalidateTag with "max" mode per tag', async () => {
		const a = nextAdapter();
		revalidateTagMock.mockClear();
		await a.invalidate(['t1', 't2'], ctx);
		expect(revalidateTagMock).toHaveBeenCalledWith('t1', 'max');
		expect(revalidateTagMock).toHaveBeenCalledWith('t2', 'max');
		expect(revalidateTagMock).toHaveBeenCalledTimes(2);
	});

	it("read always returns undefined (Next's cache is opaque to us)", async () => {
		const a = nextAdapter();
		expect(await a.read('any-key', ctx)).toBeUndefined();
	});

	it('write is a no-op — wrap is the path that touches Next cache', async () => {
		const a = nextAdapter();
		unstableCacheMock.mockClear();
		await a.write('k', 'v', ['t1'], {}, ctx);
		expect(unstableCacheMock).not.toHaveBeenCalled();
	});
});

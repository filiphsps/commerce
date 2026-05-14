import { describe, expect, it, vi } from 'vitest';
import { compose } from '../src/compose';
import type { CacheAdapter, AdapterCtx } from '../src/adapter';
import { consoleLogger } from '../src/adapter';
import { defineCache } from '../src/schema';

const ctx: AdapterCtx = {
	schema: defineCache({ namespace: 't', entities: {} }).schema,
	logger: consoleLogger,
};

const makeStub = (overrides: Partial<CacheAdapter> = {}): CacheAdapter => ({
	read: vi.fn().mockResolvedValue(undefined),
	write: vi.fn().mockResolvedValue(undefined),
	invalidate: vi.fn().mockResolvedValue(undefined),
	...overrides,
});

describe('compose', () => {
	it('write fans to every adapter in parallel', async () => {
		const a1 = makeStub();
		const a2 = makeStub();
		const composed = compose(a1, a2);
		await composed.write('k', 'v', ['tag'], {}, ctx);
		expect(a1.write).toHaveBeenCalledWith('k', 'v', ['tag'], {}, ctx);
		expect(a2.write).toHaveBeenCalledWith('k', 'v', ['tag'], {}, ctx);
	});

	it('invalidate fans to every adapter', async () => {
		const a1 = makeStub();
		const a2 = makeStub();
		const composed = compose(a1, a2);
		await composed.invalidate(['tag-a'], ctx);
		expect(a1.invalidate).toHaveBeenCalledWith(['tag-a'], ctx);
		expect(a2.invalidate).toHaveBeenCalledWith(['tag-a'], ctx);
	});

	it("read returns the first adapter's hit", async () => {
		const a1 = makeStub({ read: vi.fn().mockResolvedValue({ value: 'from-a1', tags: [] }) });
		const a2 = makeStub({ read: vi.fn().mockResolvedValue({ value: 'from-a2', tags: [] }) });
		const composed = compose(a1, a2);
		const r = await composed.read('k', ctx);
		expect(r).toEqual({ value: 'from-a1', tags: [] });
		expect(a2.read).not.toHaveBeenCalled();
	});

	it('read falls through when the first adapter misses', async () => {
		const a1 = makeStub({ read: vi.fn().mockResolvedValue(undefined) });
		const a2 = makeStub({ read: vi.fn().mockResolvedValue({ value: 'from-a2', tags: [] }) });
		const composed = compose(a1, a2);
		const r = await composed.read('k', ctx);
		expect(r).toEqual({ value: 'from-a2', tags: [] });
	});

	it('write continues after one adapter rejects (logs via ctx.logger.error)', async () => {
		const errSpy = vi.fn();
		const ctxWithSpy: AdapterCtx = { ...ctx, logger: { ...consoleLogger, error: errSpy } };
		const a1 = makeStub({ write: vi.fn().mockRejectedValue(new Error('boom')) });
		const a2 = makeStub();
		const composed = compose(a1, a2);
		await composed.write('k', 'v', [], {}, ctxWithSpy);
		expect(a2.write).toHaveBeenCalled();
		expect(errSpy).toHaveBeenCalled();
	});
});

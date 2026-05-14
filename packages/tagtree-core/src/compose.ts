import type { CacheAdapter, AdapterCtx } from './adapter';

export function compose(...adapters: CacheAdapter[]): CacheAdapter {
	const settle = async <R>(
		p: Promise<R>,
		label: string,
		ctx: AdapterCtx,
	): Promise<R | undefined> => {
		try {
			return await p;
		} catch (err) {
			ctx.logger.error(`compose: ${label} failed`, {
				error: err instanceof Error ? err.message : String(err),
			});
			return undefined;
		}
	};

	return {
		async read(key, ctx) {
			for (const a of adapters) {
				const hit = await settle(a.read(key, ctx), 'read', ctx);
				if (hit !== undefined) return hit;
			}
			return undefined;
		},

		async write(key, value, tags, opts, ctx) {
			await Promise.all(
				adapters.map((a) => settle(a.write(key, value, tags, opts, ctx), 'write', ctx)),
			);
		},

		async invalidate(tags, ctx) {
			await Promise.all(adapters.map((a) => settle(a.invalidate(tags, ctx), 'invalidate', ctx)));
		},

		decorateResponse(response, tags) {
			return adapters.reduce(
				(res, a) => (a.decorateResponse ? a.decorateResponse(res, tags) : res),
				response,
			);
		},

		async init() {
			await Promise.all(adapters.map((a) => a.init?.()));
		},
	};
}

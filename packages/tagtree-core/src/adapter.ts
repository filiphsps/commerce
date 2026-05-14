import type { CacheSchemaShape, EntitiesMap } from './schema';

export interface ILogger {
	debug: (msg: string, meta?: Record<string, unknown>) => void;
	info: (msg: string, meta?: Record<string, unknown>) => void;
	warn: (msg: string, meta?: Record<string, unknown>) => void;
	error: (msg: string, meta?: Record<string, unknown>) => void;
}

export interface AdapterCtx<S extends CacheSchemaShape = CacheSchemaShape<string, unknown, unknown, EntitiesMap>> {
	schema: S;
	logger: ILogger;
	requestScope?: unknown;
}

export interface WriteOpts {
	ttl?: number;
	swr?: boolean;
	// Drop the write if the tag index records an invalidation newer than this timestamp.
	// wrap() records a "fetch started at" timestamp before invoking the fetcher and
	// passes it here, so a webhook that fires invalidation while the fetcher is in
	// flight wins the race.
	writeIfNewerThan?: number;
}

export interface CacheAdapter {
	read(key: string, ctx: AdapterCtx): Promise<{ value: unknown; tags: string[] } | undefined>;
	write(key: string, value: unknown, tags: string[], opts: WriteOpts, ctx: AdapterCtx): Promise<void>;
	invalidate(tags: string[], ctx: AdapterCtx): Promise<void>;
	// When present, CacheInstance.wrap delegates the entire wrap-with-fetcher operation.
	// Used by adapters that ship their own caching primitive (e.g., Next's unstable_cache).
	wrap?<R>(
		key: string,
		fetcher: () => Promise<R>,
		tags: string[],
		opts: WriteOpts,
		ctx: AdapterCtx,
	): Promise<R>;
	decorateResponse?(response: Response, tags: string[]): Response;
	init?(): Promise<void>;
}

export const consoleLogger: ILogger = {
	debug: (msg, meta) => console.debug(`[tagtree] ${msg}`, meta ?? ''),
	info: (msg, meta) => console.info(`[tagtree] ${msg}`, meta ?? ''),
	warn: (msg, meta) => console.warn(`[tagtree] ${msg}`, meta ?? ''),
	error: (msg, meta) => console.error(`[tagtree] ${msg}`, meta ?? ''),
};

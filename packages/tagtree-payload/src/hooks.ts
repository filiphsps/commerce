import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, CollectionConfig } from 'payload';
import type { CacheInstance, EntitiesMap } from 'tagtree';

type Doc = {
	id: string | number;
	slug?: string;
	shopifyHandle?: string;
	tenant?: string | { id: string };
};

const tenantId = (doc: Doc): string | undefined => {
	if (!doc.tenant) return undefined;
	return typeof doc.tenant === 'string' ? doc.tenant : doc.tenant.id;
};

const docKey = (doc: Doc): string => doc.slug ?? doc.shopifyHandle ?? String(doc.id);

export interface PayloadHooksOptions {
	entity: string;
}

export function payloadHooks<NS extends string, T extends string | { id: string }, Q, E extends EntitiesMap>(
	cache: CacheInstance<NS, T, Q, E>,
	opts: PayloadHooksOptions,
): NonNullable<CollectionConfig['hooks']> {
	const invalidate = async (doc: Doc) => {
		const tid = tenantId(doc);
		if (!tid) return;
		const invalidator = (cache.invalidate as Record<string, unknown>)[opts.entity];
		if (typeof invalidator !== 'function') {
			throw new Error(
				`@tagtree/payload: entity "${opts.entity}" is not declared in the cache schema`,
			);
		}
		// The schema models each CMS collection as having a single 'key' param
		// (slug, shopifyHandle, or id fallback). Pass it as `key` and let
		// computeFanout emit the correct tag set.
		await (invalidator as (arg: { tenant: T; key: string }) => Promise<void>)({
			tenant: tid as T,
			key: docKey(doc),
		});
	};

	const afterChange: CollectionAfterChangeHook = async ({ doc }) => {
		await invalidate(doc as Doc);
		return doc;
	};

	const afterDelete: CollectionAfterDeleteHook = async ({ doc }) => {
		await invalidate(doc as Doc);
	};

	return { afterChange: [afterChange], afterDelete: [afterDelete] };
}

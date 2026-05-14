import 'server-only';

import { createCacheInstance, defineCache, str } from '@tagtree/core';
import { nextAdapter } from '@tagtree/next';

// CMS doc shape from Payload — tenant can be either a string ID or a populated
// relation object. The Payload hook (Task 27) normalizes this before calling.
type CmsTenant = string | { id: string };

const schema = defineCache({
	namespace: 'cms',
	tenant: {
		type: '' as unknown as CmsTenant,
		key: (t) => (typeof t === 'string' ? t : t.id),
	},
	entities: {
		pages: { params: { key: str } },
		articles: { params: { key: str } },
		header: { params: { key: str } },
		footer: { params: { key: str } },
		businessData: { params: { key: str } },
		productMetadata: { params: { key: str } },
		collectionMetadata: { params: { key: str } },
	},
});

export const cmsCache = createCacheInstance(schema, nextAdapter());

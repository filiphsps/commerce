import 'server-only';

import { hashToBucket } from './hash';
import { registerPredicate } from './predicates';

export function registerBuiltinPredicates(): void {
    registerPredicate<{ shopIds: string[] }>('shop', (entities, params) => params.shopIds.includes(entities.shop.id), {
        requiresUser: false,
    });

    registerPredicate<Record<string, never>>('authenticated', (entities) => entities.session !== null, {
        requiresUser: true,
    });

    registerPredicate<{ groups: string[] }>(
        'group',
        (entities, params) => entities.user?.groups?.some((g) => params.groups.includes(g)) ?? false,
        { requiresUser: true },
    );

    registerPredicate<{ bucket: number; flagKey?: string }>(
        'percentage',
        (entities, params) => {
            const bucket = Math.max(0, Math.min(100, params.bucket));
            if (bucket >= 100) return true;
            if (bucket <= 0) return false;
            return hashToBucket(entities.visitorId, params.flagKey ?? '') < bucket;
        },
        { requiresUser: false },
    );

    registerPredicate<Record<string, never>>('always', () => true, { requiresUser: false });
}

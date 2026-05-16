import 'server-only';

import { randomUUID } from 'node:crypto';
import type { Adapter } from 'flags';
import { dedupe } from 'flags/next';

import { getAuthSession } from '@/auth';
import { getRequestContext } from '@/utils/request-context';

import { type FlagEntities, mapSessionToUser } from './entities';
import { evaluatePredicate } from './predicates';

const identify = dedupe(
    async ({ headers, cookies }: { headers: Headers; cookies: { get(n: string): { value: string } | undefined } }) => {
        const ctx = await getRequestContext();
        if (!ctx) throw new Error('[flags] no request context');
        const session = await getAuthSession(ctx.shop);
        const user = await mapSessionToUser(session);
        const visitorId =
            cookies.get('nordcom-visitor-id')?.value ?? headers.get('x-nordcom-visitor-id') ?? randomUUID();
        const entities: FlagEntities = {
            shop: ctx.shop,
            session,
            user,
            visitorId,
        };
        return entities;
    },
);

type ShopWithFlags = FlagEntities['shop'] & {
    featureFlags?: Array<{
        flag: {
            key: string;
            defaultValue: unknown;
            targeting: Array<{ rule: string; params: Record<string, unknown>; value: unknown }>;
        };
    }>;
};

export function nordcomFlagAdapter<T>(): Adapter<T, FlagEntities> {
    return {
        identify,
        origin: (key) => `/admin/feature-flags/${key}`,
        decide({ key, entities, defaultValue }) {
            if (!entities) return defaultValue as T;
            const shop = entities.shop as ShopWithFlags;
            const ref = shop.featureFlags?.find((entry) => entry.flag?.key === key);
            if (!ref) return defaultValue as T;
            for (const rule of ref.flag.targeting) {
                if (evaluatePredicate(rule.rule, { ...rule.params, flagKey: key }, entities)) {
                    return rule.value as T;
                }
            }
            return ref.flag.defaultValue as T;
        },
    };
}

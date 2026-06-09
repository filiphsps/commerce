import { TodoError } from '@nordcom/commerce-errors';

import { convexServerMutation, convexServerQuery } from '../db';
import { docToIdentity } from '../lib/doc-to-shape';
import type { IdentityBase } from '../models';
import { Service, type ServiceBackend } from './service';

type ConvexDoc = Record<string, unknown>;

/**
 * Reads the `(provider, identity)` pair off a seam filter when both members are plain strings —
 * the only identity filter shape the platform uses (the Auth.js adapter's upsert key).
 *
 * @param filter - The seam filter object.
 * @returns The pair, or `null` when the filter is not a provider/identity lookup.
 */
function asProviderIdentityFilter(filter: unknown): { provider: string; identity: string } | null {
    const f = (filter ?? {}) as Record<string, unknown>;
    if (typeof f.provider === 'string' && typeof f.identity === 'string') {
        return { provider: f.provider, identity: f.identity };
    }
    return null;
}

/**
 * Convex backend for the `Identity` service. Reads resolve through `db/identities:*`; the only
 * write — the adapter's `(provider, identity)` upsert — maps onto the single-transaction
 * `upsertByProviderIdentity` mutation, which enforces the pair's uniqueness inside the mutation.
 */
const identitiesBackend: ServiceBackend<IdentityBase> = {
    name: 'Identity',
    create: async () => {
        throw new TodoError('Identity.create is not wired to the Convex seam; use findOneAndUpdate with upsert.');
    },
    findMany: async ({ id, filter }) => {
        if (id) {
            const row = await convexServerQuery<ConvexDoc | null>('db/identities:byId', { id });
            return row ? [docToIdentity(row)] : [];
        }
        const pair = asProviderIdentityFilter(filter);
        if (pair) {
            const row = await convexServerQuery<ConvexDoc | null>('db/identities:byProviderIdentity', pair);
            return row ? [docToIdentity(row)] : [];
        }
        throw new TodoError(`Identity.find filter is not supported by the Convex seam: ${JSON.stringify(filter)}`);
    },
    findById: async (id) => {
        const row = await convexServerQuery<ConvexDoc | null>('db/identities:byId', { id });
        return row ? docToIdentity(row) : null;
    },
    findOneAndUpdate: async (filter, update, options) => {
        const pair = asProviderIdentityFilter(filter);
        if (!pair) {
            throw new TodoError(
                `Identity.findOneAndUpdate filter is not supported by the Convex seam: ${JSON.stringify(filter)}`,
            );
        }
        const fields = (update ?? {}) as Record<string, unknown>;
        const row = await convexServerMutation<ConvexDoc | null>('db/identities:upsertByProviderIdentity', {
            ...pair,
            scope: typeof fields.scope === 'string' ? fields.scope : undefined,
            expiresAt: fields.expiresAt instanceof Date ? fields.expiresAt.getTime() : undefined,
            refreshToken: typeof fields.refreshToken === 'string' ? fields.refreshToken : undefined,
            accessToken: typeof fields.accessToken === 'string' ? fields.accessToken : undefined,
            upsert: (options as { upsert?: boolean } | undefined)?.upsert === true,
        });
        return row ? docToIdentity(row) : null;
    },
};

export const Identity = new Service<IdentityBase>(identitiesBackend);

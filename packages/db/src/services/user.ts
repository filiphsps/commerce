import { TodoError } from '@nordcom/commerce-errors';

import type { BaseDocument } from '../db';
import { convexServerMutation, convexServerQuery } from '../db';
import { docToUser } from '../lib/doc-to-shape';
import type { IdentityBase, UserBase } from '../models';
import { Service, type ServiceBackend } from './service';

type ConvexDoc = Record<string, unknown>;

/**
 * Serializes an `IdentityBase` into the embedded-identity payload the Convex `users` functions
 * validate: `Date`s become epoch-ms numbers and the identity keeps its canonical row id (the value
 * the adapter dedupes the embedded list on).
 *
 * @param identity - The identity document to embed.
 * @returns The wire payload for the Convex `embeddedIdentityValidator`.
 */
function toEmbeddedIdentityPayload(identity: IdentityBase): Record<string, unknown> {
    return {
        id: identity.id,
        provider: identity.provider,
        identity: identity.identity,
        scope: identity.scope,
        expiresAt: identity.expiresAt instanceof Date ? identity.expiresAt.getTime() : undefined,
        refreshToken: identity.refreshToken,
        accessToken: identity.accessToken,
        createdAt: identity.createdAt instanceof Date ? identity.createdAt.getTime() : Date.now(),
        updatedAt: identity.updatedAt instanceof Date ? identity.updatedAt.getTime() : Date.now(),
    };
}

/**
 * Convex backend for the `User` service, covering the Auth.js adapter's exact vocabulary: id
 * lookup, the `by_email` lookup, the embedded-identity `$elemMatch` lookup, `create` (unique email
 * enforced in the mutation), and the `$push: { identities }` link expressed as the
 * single-transaction `pushIdentity` mutation.
 */
const usersBackend: ServiceBackend<UserBase> = {
    name: 'User',
    create: async (input: Omit<UserBase, keyof BaseDocument>) => {
        const row = await convexServerMutation<ConvexDoc>('db/users:create', {
            email: input.email,
            name: input.name,
            avatar: input.avatar,
            emailVerified: input.emailVerified instanceof Date ? input.emailVerified.getTime() : null,
            groups: input.groups,
            identities: (input.identities ?? []).map(toEmbeddedIdentityPayload),
        });
        return docToUser(row);
    },
    findMany: async ({ id, filter }) => {
        if (id) {
            const row = await convexServerQuery<ConvexDoc | null>('db/users:byId', { id });
            return row ? [docToUser(row)] : [];
        }
        const f = (filter ?? {}) as Record<string, unknown>;
        if (typeof f.email === 'string') {
            const row = await convexServerQuery<ConvexDoc | null>('db/users:byEmail', { email: f.email });
            return row ? [docToUser(row)] : [];
        }
        const elem = (f.identities as { $elemMatch?: { provider?: unknown; identity?: unknown } } | undefined)
            ?.$elemMatch;
        if (elem && typeof elem.provider === 'string' && typeof elem.identity === 'string') {
            const row = await convexServerQuery<ConvexDoc | null>('db/users:byProviderIdentity', {
                provider: elem.provider,
                identity: elem.identity,
            });
            return row ? [docToUser(row)] : [];
        }
        throw new TodoError(`User.find filter is not supported by the Convex seam: ${JSON.stringify(filter)}`);
    },
    findById: async (id) => {
        const row = await convexServerQuery<ConvexDoc | null>('db/users:byId', { id });
        return row ? docToUser(row) : null;
    },
    findOneAndUpdate: async (filter, update) => {
        const f = (filter ?? {}) as Record<string, unknown>;
        const userId = typeof f._id === 'string' ? f._id : typeof f.id === 'string' ? f.id : undefined;
        const push = ((update ?? {}) as { $push?: { identities?: IdentityBase } }).$push;
        if (userId && push?.identities) {
            const row = await convexServerMutation<ConvexDoc | null>('db/users:pushIdentity', {
                userId,
                identity: toEmbeddedIdentityPayload(push.identities),
            });
            return row ? docToUser(row) : null;
        }
        throw new TodoError(
            `User.findOneAndUpdate is not supported by the Convex seam for: ${JSON.stringify({ filter, update })}`,
        );
    },
};

export const User = new Service<UserBase>(usersBackend);

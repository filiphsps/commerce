import { TodoError } from '@nordcom/commerce-errors';

import type { BaseDocument } from '../db';
import { convexServerMutation, convexServerQuery } from '../db';
import { docToSession } from '../lib/doc-to-shape';
import type { SessionBase } from '../models';
import { Service, type ServiceBackend } from './service';

type SessionPayload = { session: Record<string, unknown>; user: Record<string, unknown> };

/**
 * Convex backend for the `Session` service. `create` (the adapter's `createSession`) sends only the
 * owning user's id — the populated `UserBase` rides back from the single-transaction mutation so the
 * frozen `SessionBase.user` contract holds without a second round-trip. Reads resolve through the
 * `by_token` / id lookups.
 */
const sessionsBackend: ServiceBackend<SessionBase> = {
    name: 'Session',
    create: async (input: Omit<SessionBase, keyof BaseDocument>) => {
        const payload = await convexServerMutation<SessionPayload>('db/sessions:create', {
            userId: input.user.id,
            token: input.token,
            expiresAt: input.expiresAt instanceof Date ? input.expiresAt.getTime() : input.expiresAt,
        });
        return docToSession(payload);
    },
    findMany: async ({ id, filter }) => {
        if (id) {
            const payload = await convexServerQuery<SessionPayload | null>('db/sessions:byId', { id });
            return payload ? [docToSession(payload)] : [];
        }
        const f = (filter ?? {}) as Record<string, unknown>;
        if (typeof f.token === 'string') {
            const payload = await convexServerQuery<SessionPayload | null>('db/sessions:byToken', {
                token: f.token,
            });
            return payload ? [docToSession(payload)] : [];
        }
        throw new TodoError(`Session.find filter is not supported by the Convex seam: ${JSON.stringify(filter)}`);
    },
    findById: async (id) => {
        const payload = await convexServerQuery<SessionPayload | null>('db/sessions:byId', { id });
        return payload ? docToSession(payload) : null;
    },
    findOneAndUpdate: async (filter, update) => {
        throw new TodoError(
            `Session.findOneAndUpdate is not supported by the Convex seam for: ${JSON.stringify({ filter, update })}`,
        );
    },
};

export const Session = new Service<SessionBase>(sessionsBackend);

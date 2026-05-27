import type { InferSchemaType } from 'mongoose';
import { Schema } from 'mongoose';
import type { BaseDocument } from '../db';
import { db } from '../db';
import type { UserBase } from './user';

export const SessionSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'User',
        },
        token: {
            type: Schema.Types.String,
            required: true,
        },
        expiresAt: {
            type: Schema.Types.Date,
            required: true,
        },
    },
    {
        id: true,
        timestamps: true,
    },
);

/**
 * Document shape for an authenticated session. Pairs a bearer token with an expiry date and a
 * reference to the owning user. The `user` field is always the populated `UserBase` shape; the
 * underlying ObjectId reference is hidden by this type.
 *
 * @example
 * ```ts
 * import type { SessionBase } from '@nordcom/commerce-db';
 * function isActive(session: SessionBase): boolean {
 *     return session.expiresAt > new Date();
 * }
 * ```
 */
// `user` is stored as ObjectId on disk; consumers expect the populated `UserBase`.
export type SessionBase = BaseDocument & Omit<InferSchemaType<typeof SessionSchema>, 'user'> & { user: UserBase };

export const SessionModel = (db.models.Session || db.model('Session', SessionSchema)) as ReturnType<
    typeof db.model<typeof SessionSchema>
>;

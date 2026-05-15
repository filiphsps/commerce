import type { InferSchemaType } from 'mongoose';
import { Schema } from 'mongoose';
import type { BaseDocument } from '../db';
import { db } from '../db';

export const IdentitySchema = new Schema(
    {
        provider: {
            type: Schema.Types.String,
            required: true,
        },
        identity: {
            type: Schema.Types.String,
            required: true,
        },
        scope: {
            type: Schema.Types.String,
        },
        expiresAt: {
            type: Schema.Types.Date,
        },
        refreshToken: {
            type: Schema.Types.String,
        },
        accessToken: {
            type: Schema.Types.String,
        },
    },
    {
        id: true,
        timestamps: true,
    },
);

export type IdentityBase = BaseDocument & InferSchemaType<typeof IdentitySchema>;
// `identity` alone is not unique across providers — GitHub user `42` and a
// future Google user `42` would collide on the single-field index. Lookups
// always go via (provider, providerAccountId) anyway. Adding a new provider
// later would otherwise fail mid-OAuth for any colliding numeric id.
IdentitySchema.index({ provider: 1, identity: 1 }, { unique: true });

export const IdentityModel = (db.models.Identity || db.model('Identity', IdentitySchema)) as ReturnType<
    typeof db.model<typeof IdentitySchema>
>;

import { Schema } from 'mongoose';
import type { BaseDocument } from '../db';
import { db } from '../db';

export interface IdentityBase extends BaseDocument {
    provider: string;
    identity: string;
    scope?: string;

    expiresAt?: Date;
    refreshToken?: string;
    accessToken?: string;
}

export const IdentitySchema = new Schema<IdentityBase>(
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
// `identity` alone is not unique across providers — GitHub user `42` and a
// future Google user `42` would collide on the single-field index. Lookups
// always go via (provider, providerAccountId) anyway. Adding a new provider
// later would otherwise fail mid-OAuth for any colliding numeric id.
IdentitySchema.index({ provider: 1, identity: 1 }, { unique: true });

export const IdentityModel = (db.models.Identity || db.model('Identity', IdentitySchema)) as ReturnType<
    typeof db.model<typeof IdentitySchema>
>;

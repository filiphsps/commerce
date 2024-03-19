import { Schema } from 'mongoose';
import { User } from '.';
import { db } from '../db';

import type { Document } from '../db';

export interface Identity extends Omit<Document, '_id'> {
    user: User;
    provider: string;
    identity: string;
    scope?: string;

    expiresAt?: Date;
    refreshToken?: string;
    accessToken?: string;
}

export const IdentitySchema = new Schema<Identity>(
    {
        provider: {
            type: Schema.Types.String,
            required: true
        },
        identity: {
            type: Schema.Types.String,
            required: true,
            unique: true
        },
        scope: {
            type: Schema.Types.String
        },
        expiresAt: {
            type: Schema.Types.Date
        },
        refreshToken: {
            type: Schema.Types.String
        },
        accessToken: {
            type: Schema.Types.String
        }
    },
    {
        id: true,
        timestamps: true,
        versionKey: false
    }
);

export const Identity = (db.models.Identity || db.model('Identity', IdentitySchema)) as ReturnType<
    typeof db.model<typeof IdentitySchema>
>;

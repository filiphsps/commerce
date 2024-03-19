import { Schema } from 'mongoose';
import { Identity, IdentitySchema } from '.';
import { db } from '../db';

import type { Document } from '../db';

export interface User extends Document {
    email: string;
    name: string;
    avatar?: string;
    identities: Identity[];

    emailVerified: Date | null;
}

export const UserSchema = new Schema<User>(
    {
        email: {
            type: Schema.Types.String,
            required: true,
            unique: true
        },
        name: {
            type: Schema.Types.String,
            required: true
        },
        avatar: {
            type: Schema.Types.String,
            default: null
        },
        identities: [
            {
                type: IdentitySchema,
                default: []
            }
        ],

        emailVerified: {
            type: Schema.Types.Date,
            default: null
        }
    },
    {
        id: true,
        timestamps: true,
        versionKey: false
    }
);

export const User = (db.models.User || db.model('User', UserSchema)) as ReturnType<typeof db.model<typeof UserSchema>>;

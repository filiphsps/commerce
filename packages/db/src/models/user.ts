import { Schema } from 'mongoose';
import { IdentityBase, IdentitySchema } from '.';
import { db } from '../db';

import type { BaseDocument } from '../db';

export interface UserBase extends BaseDocument {
    email: string;
    name: string;
    avatar?: string;
    identities: IdentityBase[];

    emailVerified: Date | null;
}

export const UserSchema = new Schema<UserBase>(
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

export const UserModel = (db.models.User || db.model('User', UserSchema)) as ReturnType<
    typeof db.model<typeof UserSchema>
>;

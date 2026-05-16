import type { InferSchemaType } from 'mongoose';
import { Schema } from 'mongoose';
import type { BaseDocument } from '../db';
import { db } from '../db';
import type { IdentityBase } from './identity';
import { IdentitySchema } from './identity';

export const UserSchema = new Schema(
    {
        email: {
            type: Schema.Types.String,
            required: true,
            unique: true,
        },
        name: {
            type: Schema.Types.String,
            required: true,
        },
        avatar: {
            type: Schema.Types.String,
            default: null,
        },
        identities: [
            {
                type: IdentitySchema,
                default: [],
            },
        ],

        emailVerified: {
            type: Schema.Types.Date,
            default: null,
        },

        groups: {
            type: [Schema.Types.String],
            required: false,
            default: undefined,
        },
    },
    {
        id: true,
        timestamps: true,
    },
);

type InferredUser = InferSchemaType<typeof UserSchema>;

// `avatar` and `emailVerified` use `default: null` in the schema; the public
// API exposes them as optional/nullable to match the NextAuth adapter contract.
export type UserBase = BaseDocument &
    Omit<InferredUser, 'identities' | 'avatar' | 'emailVerified' | 'groups'> & {
        identities: IdentityBase[];
        avatar?: string;
        emailVerified: Date | null;
        groups?: string[];
    };

export const UserModel = (db.models.User || db.model('User', UserSchema)) as ReturnType<
    typeof db.model<typeof UserSchema>
>;

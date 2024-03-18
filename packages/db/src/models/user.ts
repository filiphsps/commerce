import { Schema } from 'mongoose';

import type { Document, Model, Mongoose } from 'mongoose';

export interface User extends Document {
    name: string;
    email: string;
    avatar?: string;
}

export const UserSchema = new Schema<User>(
    {
        name: {
            type: Schema.Types.String,
            required: true
        },
        email: {
            type: Schema.Types.String,
            required: true
        },

        avatar: {
            type: Schema.Types.String,
            default: null
        }
    },
    {
        id: true,
        timestamps: true,
        versionKey: false
    }
);

export default (db: Mongoose): Model<User> => db.models.User || db.model<User>('User', UserSchema);

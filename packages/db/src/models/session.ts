import { Schema } from 'mongoose';

import { db } from '../db';

import type { BaseDocument } from '../db';
import type { UserBase } from '.';

export interface SessionBase extends BaseDocument {
    user: UserBase;
    token: string;
    expires: Date;
}

export const SessionSchema = new Schema<SessionBase>(
    {
        user: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        },
        token: {
            type: Schema.Types.String,
            required: true
        },
        expires: {
            type: Schema.Types.Date,
            required: true
        }
    },
    {
        id: true,
        timestamps: false,
        versionKey: false
    }
);

export const SessionModel = (db.models.Identity || db.model('Session', SessionSchema)) as ReturnType<
    typeof db.model<typeof SessionSchema>
>;

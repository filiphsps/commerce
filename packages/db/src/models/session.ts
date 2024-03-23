import { Schema } from 'mongoose';

import { db } from '../db';

import type { BaseDocument } from '../db';
import type { UserBase } from '.';

export interface SessionBase extends BaseDocument {
    user: UserBase;
    token: string;
    expiresAt: Date;
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
        expiresAt: {
            type: Schema.Types.Date,
            required: true
        }
    },
    {
        id: true,
        timestamps: true,
        versionKey: false
    }
);

export const SessionModel = (db.models.Session || db.model('Session', SessionSchema)) as ReturnType<
    typeof db.model<typeof SessionSchema>
>;

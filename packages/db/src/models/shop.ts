import { Schema } from 'mongoose';
import { User } from '.';
import { db } from '../db';

import type { Document } from '../db';

export interface Shop extends Document {
    name: string;
    domain: string;
    alternativeDomains?: string[];
    collaborators: {
        user: User;
    }[];
}

export const ShopSchema = new Schema<Shop>(
    {
        name: {
            type: Schema.Types.String,
            required: true
        },

        domain: {
            type: Schema.Types.String,
            unique: true,
            required: true
        },
        alternativeDomains: [
            {
                type: Schema.Types.String,
                default: []
            }
        ],

        collaborators: {
            type: [
                {
                    user: {
                        type: Schema.Types.ObjectId,
                        ref: 'User'
                    },
                    permissions: [
                        {
                            type: Schema.Types.String,
                            default: []
                        }
                    ]
                }
            ],
            required: true,
            default: []
        }
    },
    {
        id: true,
        timestamps: true,
        versionKey: false
    }
);

export const Shop = (db.models.Shop || db.model('Shop', ShopSchema)) as ReturnType<typeof db.model<typeof ShopSchema>>;

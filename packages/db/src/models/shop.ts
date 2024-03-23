import { Schema } from 'mongoose';

import { db } from '../db';

import type { BaseDocument } from '../db';
import type { UserBase } from '.';

export interface ShopBase extends BaseDocument {
    name: string;
    domain: string;
    alternativeDomains?: string[];
    collaborators: {
        user: UserBase;
    }[];
}

export const ShopSchema = new Schema<ShopBase>(
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

export const ShopModel = (db.models.Shop || db.model('Shop', ShopSchema)) as ReturnType<
    typeof db.model<typeof ShopSchema>
>;

import { Schema } from 'mongoose';

import type { Document, Model, Mongoose } from 'mongoose';

export interface Shop extends Document {
    name: string;
    domain: string;
    alternativeDomains?: string[];
    collaborators: {
        user: any;
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
                    }
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

export default (db: Mongoose): Model<Shop> => db.models.Shop || db.model<Shop>('Shop', ShopSchema);

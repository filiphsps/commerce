import type { InferSchemaType } from 'mongoose';
import { Schema } from 'mongoose';
import type { BaseDocument } from '../db';
import { db } from '../db';
import type { ShopBase } from './shop';
import { ShopSchema } from './shop';

export const ReviewSchema = new Schema(
    {
        shop: {
            type: ShopSchema,
            required: true,
        },
    },
    {
        id: true,
        timestamps: true,
    },
);

// `shop` infers as the embedded sub-document shape; expose the public `ShopBase` instead.
export type ReviewBase = BaseDocument & Omit<InferSchemaType<typeof ReviewSchema>, 'shop'> & { shop: ShopBase };

export const ReviewModel = (db.models.Review || db.model('Review', ReviewSchema)) as ReturnType<
    typeof db.model<typeof ReviewSchema>
>;

import { Schema } from 'mongoose';
import type { BaseDocument } from '../db';
import { db } from '../db';
import type { ShopBase } from './shop';
import { ShopSchema } from './shop';

export interface ReviewBase extends BaseDocument {
    shop: ShopBase;
}

export const ReviewSchema = new Schema<ReviewBase>(
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

export const ReviewModel = (db.models.Review || db.model('Review', ReviewSchema)) as ReturnType<
    typeof db.model<typeof ReviewSchema>
>;

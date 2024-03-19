import 'server-only';

import { MissingEnvironmentVariableError } from '@nordcom/commerce-errors';
import mongoose from 'mongoose';

import type { Document } from 'mongoose';

interface DocumentWithId extends Document {
    id: string;
}
export type { DocumentWithId as Document };

mongoose.set('strictQuery', true);
mongoose.set('strict', 'throw');
mongoose.set('toJSON', {
    virtuals: true
});
mongoose.set('toObject', {
    virtuals: true,
    transform: (doc, ret) => {
        doc.id = ret._id;
        return ret;
    }
});

const uri = process.env.MONGODB_URI as string;
if (!uri) throw new MissingEnvironmentVariableError('MONGODB_URI');

export const db = await mongoose.connect(uri, {
    bufferCommands: false
});

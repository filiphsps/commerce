import 'server-only';

import { MissingEnvironmentVariableError } from '@nordcom/commerce-errors';

import mongoose from 'mongoose';

import type { Document } from 'mongoose';

interface BaseDocument extends Document {
    id: string;
}
export type { BaseDocument };

mongoose.set('strictQuery', false);
mongoose.set('strict', false);
mongoose.set('toJSON', {
    transform: (doc, ret) => {
        doc.id = ret._id;
        return ret;
    }
});
mongoose.set('toObject', {
    transform: (doc, ret) => {
        doc.id = ret._id;
        return ret;
    }
});

const uri = process.env.MONGODB_URI as string;
if (!uri) throw new MissingEnvironmentVariableError('MONGODB_URI');

export const db = await mongoose.connect(uri, {
    autoCreate: true,
    autoIndex: true,
    bufferCommands: false
});

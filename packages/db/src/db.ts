import 'server-only';

import { MissingEnvironmentVariableError } from '@nordcom/commerce-errors';
import type { Document } from 'mongoose';
import mongoose from 'mongoose';

export type DocumentExtras = {
    id: string;
};
export type BaseDocument = Omit<Document, keyof DocumentExtras> & DocumentExtras;

const uri = process.env.MONGODB_URI as string;
if (!uri) throw new MissingEnvironmentVariableError('MONGODB_URI');

export const db = await mongoose.connect(uri, {
    autoCreate: true,
    autoIndex: true,
    bufferCommands: false,
});

try {
    db.set('strictQuery', false);
    db.set('strict', false);
} catch {}

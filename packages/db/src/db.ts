import 'server-only';

import { MissingEnvironmentVariableError } from '@nordcom/commerce-errors';
import type { Document } from 'mongoose';
import mongoose from 'mongoose';

export type DocumentExtras = {
    id: string;
};
// All schemas in this package set `timestamps: true`, so every document has
// `createdAt`/`updatedAt`. Including them here lets `Service.create` strip
// them from its input via `Omit<DocType, keyof BaseDocument>`.
export type BaseTimestamps = {
    createdAt: Date;
    updatedAt: Date;
};
export type BaseDocument = Omit<Document, keyof DocumentExtras> & DocumentExtras & BaseTimestamps;

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

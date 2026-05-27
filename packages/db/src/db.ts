import 'server-only';

import { MissingEnvironmentVariableError } from '@nordcom/commerce-errors';
import type { Document } from 'mongoose';
import mongoose from 'mongoose';

/**
 * String `id` virtual that Mongoose exposes on every document. All document types in this package
 * extend `BaseDocument`, which includes this field, so callers can always read `doc.id` as a string.
 *
 * @example
 * ```ts
 * import type { DocumentExtras } from '@nordcom/commerce-db';
 * function getId(doc: DocumentExtras): string {
 *     return doc.id;
 * }
 * ```
 */
export type DocumentExtras = {
    id: string;
};
/**
 * Timestamp fields Mongoose automatically manages when a schema is created with `timestamps: true`.
 * Every schema in this package sets that option, so all document types carry these fields.
 * Exposing them here lets `Service.create` strip them via `Omit<DocType, keyof BaseDocument>`.
 *
 * @example
 * ```ts
 * import type { BaseTimestamps } from '@nordcom/commerce-db';
 * function ageMs(doc: BaseTimestamps): number {
 *     return Date.now() - doc.createdAt.getTime();
 * }
 * ```
 */
// All schemas in this package set `timestamps: true`, so every document has
// `createdAt`/`updatedAt`. Including them here lets `Service.create` strip
// them from its input via `Omit<DocType, keyof BaseDocument>`.
export type BaseTimestamps = {
    createdAt: Date;
    updatedAt: Date;
};
/**
 * Baseline type for every document in this package. Combines the Mongoose `Document` interface
 * with the string `id` virtual and the managed `createdAt`/`updatedAt` fields. All model-specific
 * types extend this via intersection rather than inherit it, so they remain compatible with plain
 * objects returned by `.lean()`.
 *
 * @example
 * ```ts
 * import type { BaseDocument } from '@nordcom/commerce-db';
 * function label(doc: BaseDocument): string {
 *     return `${doc.id} (updated ${doc.updatedAt.toISOString()})`;
 * }
 * ```
 */
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

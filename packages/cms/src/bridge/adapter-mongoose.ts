import type { Model } from 'mongoose';
import type { Field } from 'payload';
import type { BridgeAdapter, BridgeManifest } from './manifest';

const stripInternals = (obj: Record<string, unknown>): Record<string, unknown> => {
    const { _id, __v, ...rest } = obj;
    return rest;
};

export const defaultToPlain = (doc: unknown): Record<string, unknown> => {
    if (
        doc &&
        typeof doc === 'object' &&
        'toObject' in doc &&
        typeof (doc as { toObject: unknown }).toObject === 'function'
    ) {
        const plain = (doc as { toObject: () => Record<string, unknown> }).toObject();
        return stripInternals(plain);
    }
    if (doc && typeof doc === 'object') {
        return stripInternals(doc as Record<string, unknown>);
    }
    return {};
};

const isGroupField = (f: Field): f is Field & { name: string; type: 'group'; fields: Field[] } =>
    (f as { type?: string }).type === 'group' && Array.isArray((f as { fields?: unknown }).fields);

export const coerceMissingGroups = (
    values: Record<string, unknown>,
    fields: BridgeManifest['fields'],
): Record<string, unknown> => {
    const out = { ...values };
    for (const field of fields) {
        if (!isGroupField(field)) continue;
        const current = out[field.name];
        if (current === undefined || current === null) {
            out[field.name] = coerceMissingGroups({}, field.fields);
        } else if (typeof current === 'object') {
            out[field.name] = coerceMissingGroups(current as Record<string, unknown>, field.fields);
        }
    }
    return out;
};

export type MongooseAdapterOptions = {
    idKey?: '_id' | string;
    toPlain?: (doc: unknown) => Record<string, unknown>;
    redact?: (doc: Record<string, unknown>) => Record<string, unknown>;
};

export const mongooseAdapter = <TDoc>(
    // biome-ignore lint/suspicious/noExplicitAny: Mongoose's Model generic conflicts with our TDoc bound; we cast at the boundary
    model: Model<any>,
    options: MongooseAdapterOptions = {},
): BridgeAdapter<TDoc> => {
    const idKey = options.idKey ?? '_id';
    const toPlain = options.toPlain ?? defaultToPlain;
    const redact = options.redact ?? ((doc) => doc);

    return {
        async findById(id) {
            const doc = await model.findOne({ [idKey]: id }).exec();
            if (!doc) return null;
            return redact(toPlain(doc)) as TDoc;
        },
        async update(id, patch) {
            const doc = await model
                .findOneAndUpdate(
                    { [idKey]: id },
                    { $set: patch as Record<string, unknown> },
                    { new: true, runValidators: true },
                )
                .exec();
            if (!doc) {
                throw new Error(`[bridge] update: no ${model.modelName} with ${idKey}=${id}`);
            }
            return toPlain(doc) as TDoc;
        },
        async delete(id) {
            await model.deleteOne({ [idKey]: id }).exec();
        },
    };
};

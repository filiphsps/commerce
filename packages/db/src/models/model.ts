import { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

import type { InferSchemaType } from 'mongoose';
import { BaseSchema, extendSchema } from 'monguito';

export const types = {
    ID: Schema.Types.UUID,
    String: Schema.Types.String
};

export type BaseSchema = {
    id: typeof types.ID;
};

type ConstructorArgs<T> = T extends new (...args: infer U) => any ? U : never;
export const createSchema = <T extends object>(
    definition: ConstructorArgs<typeof Schema<T>>[0] = {},
    opts: ConstructorArgs<typeof Schema<T>>[1] = {}
) => {
    const schema = extendSchema<T & BaseSchema>(
        BaseSchema,
        {
            id: {
                type: types.ID,
                default: uuidv4(),
                immutable: true,
                unique: true
            },
            ...(definition as object)
        },
        {
            _id: false,
            id: false,
            timestamps: true,
            versionKey: false,

            ...(opts as object)
        }
    );

    return schema as Schema<InferSchemaType<typeof schema>>;
};

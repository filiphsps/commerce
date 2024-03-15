import { createSchema, types } from './model';

import type { Mongoose } from 'mongoose';

export const schema = createSchema({
    name: {
        type: types.String,
        required: true
    },
    email: {
        type: types.String,
        required: true
    },

    avatar: {
        type: types.String,
        default: null
    }
});

export default (db: Mongoose) => db.model('User', schema);

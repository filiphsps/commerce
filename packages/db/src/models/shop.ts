import { createSchema, types } from './model';

import type { Mongoose } from 'mongoose';

export const schema = createSchema({
    name: {
        type: types.String,
        required: true
    },

    domain: {
        type: types.String,
        unique: true,
        required: true
    },
    alternativeDomains: [
        {
            type: types.String,
            default: []
        }
    ],

    collaborators: [
        {
            user: {
                type: types.ID,
                ref: 'User'
            }
            // TODO: Permissions.
        }
    ]
});

export default (db: Mongoose) => db.model('Shop', schema);

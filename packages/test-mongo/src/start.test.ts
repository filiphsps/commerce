import { createConnection, Schema } from 'mongoose';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { type StartedMongo, startMongo } from './start';

describe('startMongo', () => {
    let handle: StartedMongo;

    beforeEach(async () => {
        handle = await startMongo();
    });

    afterEach(async () => {
        await handle.stop();
    });

    it('boots a replica set, accepts mongoose writes/reads, then stops cleanly', async () => {
        expect(handle.uri).toMatch(/^mongodb:\/\/.+/);
        expect(handle.uri).toContain('replicaSet=');

        const conn = await createConnection(handle.uri, { bufferCommands: false }).asPromise();
        try {
            const Thing = conn.model('Thing', new Schema({ name: String }));
            await Thing.create({ name: 'hello' });
            const found = await Thing.findOne({ name: 'hello' }).lean();
            expect(found?.name).toBe('hello');
        } finally {
            await conn.close();
        }
    });

    it('supports a multi-document transaction (Payload depends on this)', async () => {
        const conn = await createConnection(handle.uri, { bufferCommands: false }).asPromise();
        try {
            const Thing = conn.model('TxThing', new Schema({ name: String }));

            const session = await conn.startSession();
            try {
                await session.withTransaction(async () => {
                    await Thing.create([{ name: 'a' }], { session });
                    await Thing.create([{ name: 'b' }], { session });
                });
            } finally {
                await session.endSession();
            }

            const count = await Thing.countDocuments();
            expect(count).toBe(2);
        } finally {
            await conn.close();
        }
    });
});

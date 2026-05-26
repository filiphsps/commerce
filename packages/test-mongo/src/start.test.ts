import { connect, disconnect, model, Schema } from 'mongoose';
import { describe, expect, it } from 'vitest';

import { startMongo } from './start';

describe('startMongo', () => {
    it('boots a replica set, accepts mongoose writes/reads, then stops cleanly', async () => {
        const { uri, stop } = await startMongo();
        expect(uri).toMatch(/^mongodb:\/\/.+/);
        expect(uri).toContain('replicaSet=');

        await connect(uri, { bufferCommands: false });
        const Thing = model('Thing', new Schema({ name: String }));
        await Thing.create({ name: 'hello' });
        const found = await Thing.findOne({ name: 'hello' }).lean();
        expect(found?.name).toBe('hello');

        await disconnect();
        await stop();
    });

    it('supports a multi-document transaction (Payload depends on this)', async () => {
        const { uri, stop } = await startMongo();
        const conn = await connect(uri, { bufferCommands: false });
        const Thing = model('TxThing', new Schema({ name: String }));

        const session = await conn.startSession();
        await session.withTransaction(async () => {
            await Thing.create([{ name: 'a' }], { session });
            await Thing.create([{ name: 'b' }], { session });
        });
        await session.endSession();

        const count = await Thing.countDocuments();
        expect(count).toBe(2);

        await disconnect();
        await stop();
    });
});

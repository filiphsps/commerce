import type { Payload } from 'payload';
import { getPayload } from 'payload';
import { buildPayloadConfig } from '../config';

export type TestPayload = {
    instance: Payload;
    dbName: string;
    teardown: () => Promise<void>;
};

export async function bootTestPayload({ suite }: { suite: string }): Promise<TestPayload> {
    const baseUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/test';
    const url = new URL(baseUri);
    const dbName = `test_${suite}_${Date.now()}`;
    url.pathname = `/${dbName}`;

    const config = await buildPayloadConfig({
        secret: process.env.PAYLOAD_SECRET ?? 'test-secret',
        mongoUrl: url.toString(),
        includeAdmin: false,
        enableStorage: false,
    });

    const instance = await getPayload({ config });

    return {
        instance,
        dbName,
        teardown: async () => {
            await instance.db.connection?.dropDatabase();
            await instance.db.destroy?.();
        },
    };
}

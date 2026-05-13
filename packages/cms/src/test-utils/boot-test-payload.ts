import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import type { Payload } from 'payload';
import { buildConfig, getPayload } from 'payload';

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

    const config = await buildConfig({
        secret: process.env.PAYLOAD_SECRET ?? 'test-secret',
        db: mongooseAdapter({ url: url.toString() }),
        editor: lexicalEditor({}),
        collections: [],
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

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { buildConfig, getPayload } from 'payload';
import type { Payload } from 'payload';
import { tenants } from './tenants';
import { media } from './media';

describe('media collection', () => {
    let payload: Payload;

    beforeAll(async () => {
        const baseUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/test';
        const url = new URL(baseUri);
        url.pathname = `/test_media_${Date.now()}`;
        const config = await buildConfig({
            secret: 'test',
            db: mongooseAdapter({ url: url.toString() }),
            editor: lexicalEditor({}),
            collections: [tenants, media],
        });
        payload = await getPayload({ config });
    });

    afterAll(async () => {
        await payload.db.connection?.dropDatabase();
        await payload.db.destroy?.();
    });

    it('media collection is configured with imageSizes', () => {
        const collection = payload.collections.media;
        expect(collection).toBeDefined();
        expect(collection?.config.upload).toBeDefined();
        const sizes = collection?.config.upload?.imageSizes ?? [];
        expect(sizes.map((s) => s.name)).toEqual(['thumbnail', 'card', 'feature', 'hero']);
    });

    it('alt text field is required', () => {
        const collection = payload.collections.media;
        expect(collection).toBeDefined();
        const alt = collection?.config.fields.find((f) => 'name' in f && f.name === 'alt');
        expect(alt).toBeDefined();
        expect((alt as { required?: boolean }).required).toBe(true);
    });
});

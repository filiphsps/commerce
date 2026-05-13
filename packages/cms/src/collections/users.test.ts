import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import type { Payload } from 'payload';
import { buildConfig, getPayload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tenants } from './tenants';
import { users } from './users';

describe('users collection', () => {
    let payload: Payload;

    beforeAll(async () => {
        const baseUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/test';
        const url = new URL(baseUri);
        url.pathname = `/test_users_${Date.now()}`;
        const config = await buildConfig({
            secret: 'test',
            db: mongooseAdapter({ url: url.toString() }),
            editor: lexicalEditor({}),
            collections: [tenants, users],
            plugins: [
                multiTenantPlugin({
                    tenantsSlug: 'tenants',
                    userHasAccessToAllTenants: (user: unknown) => (user as { role?: string } | null)?.role === 'admin',
                    collections: {},
                }),
            ],
        });
        payload = await getPayload({ config });
    });

    afterAll(async () => {
        await payload.db.connection?.dropDatabase();
        await payload.db.destroy?.();
    });

    it('creates a user with email + role', async () => {
        const user = await payload.create({
            collection: 'users',
            data: { email: 'editor@example.com', role: 'editor', password: 'tmp-only' },
        });
        expect(user.email).toBe('editor@example.com');
        expect(user.role).toBe('editor');
    });

    it('users can be linked to tenants', async () => {
        const t = await payload.create({
            collection: 'tenants',
            data: { name: 'X', slug: 'x', defaultLocale: 'en-US', locales: ['en-US'] },
        });
        const user = await payload.create({
            collection: 'users',
            data: {
                email: 'multi@example.com',
                role: 'editor',
                password: 'tmp-only',
                tenants: [{ tenant: t.id }],
            },
        });
        expect(user.tenants).toHaveLength(1);
    });
});

import { writeFile } from 'node:fs/promises';
import { register } from 'node:module';

import { seedCanonical } from '@nordcom/commerce-test-mongo';
import mongoose, { type Model, Schema } from 'mongoose';
import { encode } from 'next-auth/jwt';

import { STORAGE_STATE_PATH } from './fixtures/storage-state';

// Seed-time only: stub `next/cache` for Payload's afterChange hooks. Can't
// widen the `--import` loader to do this because webServer inherits
// NODE_OPTIONS and stubbing `next/cache` would break real Next runtime caching.
register('@nordcom/commerce-test-mongo/seed-loader', import.meta.url);

const TEST_EMAIL = 'e2e-test@example.com';

type UserDoc = {
    email: string;
    name: string;
    avatar: string | null;
    identities: unknown[];
    emailVerified: Date | null;
};

type PayloadUserDoc = {
    email: string;
    role: 'admin' | 'editor';
    tenants: Array<{ tenant: mongoose.Types.ObjectId; id: string }>;
    loginAttempts: number;
    sessions: unknown[];
};

const UserSchema = new Schema<UserDoc>(
    {
        email: { type: Schema.Types.String, required: true, unique: true },
        name: { type: Schema.Types.String, required: true },
        avatar: { type: Schema.Types.String, default: null },
        identities: [{ type: Schema.Types.Mixed, default: [] }],
        emailVerified: { type: Schema.Types.Date, default: null },
    },
    { id: true, timestamps: true },
);

const PayloadUserSchema = new Schema<PayloadUserDoc>(
    {
        email: { type: Schema.Types.String, required: true, unique: true },
        role: { type: Schema.Types.String, enum: ['admin', 'editor'], default: 'editor' },
        tenants: [
            {
                tenant: { type: Schema.Types.ObjectId },
                id: { type: Schema.Types.String },
            },
        ],
        loginAttempts: { type: Schema.Types.Number, default: 0 },
        sessions: [{ type: Schema.Types.Mixed, default: [] }],
    },
    { id: true, timestamps: true },
);

/**
 * Playwright globalSetup: re-seeds the canonical demo tenant against the
 * daemon mongo (booted by root `pretest:e2e` and exposed via MONGODB_URI),
 * adds the test user as a Shop collaborator, and writes a Next-Auth-v5
 * session cookie so the admin shell loads pre-authenticated.
 *
 * Uses the existing MONGODB_URI rather than starting its own mongo so that
 * the webServer (which Playwright starts BEFORE globalSetup, reading the
 * URI from `.env.local`) and the seed write to the same instance.
 *
 * @returns Resolves once seeding + storage state write complete.
 * @throws If `MONGODB_URI` or `NEXTAUTH_SECRET` / `AUTH_SECRET` is unset.
 */
export default async function globalSetup(): Promise<void> {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('[admin global-setup] MONGODB_URI must be set — run via `pnpm test:e2e`');
    }
    process.env.PAYLOAD_SECRET = process.env.PAYLOAD_SECRET ?? 'development-secret';
    await seedCanonical(uri);

    const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
    if (!secret) throw new Error('[admin global-setup] NEXTAUTH_SECRET / AUTH_SECRET is required');

    const conn = await mongoose
        .createConnection(uri, {
            autoCreate: true,
            autoIndex: true,
            bufferCommands: false,
        })
        .asPromise();

    let userId: string;
    try {
        const UserModel: Model<UserDoc> = conn.models.User ?? conn.model<UserDoc>('User', UserSchema);
        const existing = await UserModel.findOne({ email: TEST_EMAIL }).lean<{ _id: mongoose.Types.ObjectId }>().exec();
        if (existing) {
            userId = existing._id.toString();
        } else {
            const created = await UserModel.create({
                email: TEST_EMAIL,
                name: 'E2E Test User',
                avatar: null,
                identities: [],
                emailVerified: null,
            });
            if (!created) throw new Error('[admin global-setup] UserModel.create returned null');
            userId = created._id.toString();
        }

        // `/${domain}/...` routes call `getShopsForUser` which queries
        // `shops.collaborators.user`. Without this entry the shell bounces
        // every request to the "Choose a Shop" picker.
        await conn
            .collection('shops')
            .updateOne(
                { domain: 'nordcom-demo-shop.com' },
                { $set: { collaborators: [{ user: new mongoose.Types.ObjectId(userId), permissions: ['admin'] }] } },
            );

        // Matching Payload user so getAuthedPayloadCtx can resolve the
        // NextAuth session to a Payload principal — without this every
        // content route redirects to /auth/login/.
        const PayloadUserModel: Model<PayloadUserDoc> =
            conn.models['payload-users'] ??
            conn.model<PayloadUserDoc>('payload-users', PayloadUserSchema, 'payload-users');

        // seedCanonical inserts a Payload Tenant doc with the slug below;
        // the test user needs that tenant in its `tenants` array for
        // collection-edit pages to grant write access.
        const tenantDoc = await conn.collection('tenants').findOne({ slug: 'nordcom-demo-shop' });
        if (!tenantDoc) throw new Error('[admin global-setup] expected the seeded payload tenant');
        const tenantLink = {
            tenant: tenantDoc._id as mongoose.Types.ObjectId,
            id: String(tenantDoc._id),
        };

        await PayloadUserModel.updateOne(
            { email: TEST_EMAIL },
            {
                $set: { role: 'admin', tenants: [tenantLink] },
                $setOnInsert: { email: TEST_EMAIL, loginAttempts: 0, sessions: [] },
            },
            { upsert: true },
        );
    } finally {
        await conn.close();
    }

    // Mirror auth.config.ts's `IS_PROD` switch: CI's webServer is `next start`
    // (NODE_ENV=production → `__Secure-` cookie); local uses `next dev`
    // (NODE_ENV=development → plain cookie). The salt must equal the cookie
    // name. See apps/admin/src/utils/auth.config.ts.
    const isSecure = !!process.env.CI;
    const cookieName = isSecure ? '__Secure-authjs.session-token' : 'authjs.session-token';

    const token = await encode({
        salt: cookieName,
        secret,
        token: {
            sub: userId,
            email: TEST_EMAIL,
            name: 'E2E Test User',
        },
    });

    const storageState = {
        cookies: [
            {
                name: cookieName,
                value: token,
                domain: 'localhost',
                path: '/',
                httpOnly: true,
                secure: isSecure,
                sameSite: 'Lax' as const,
                expires: Math.floor(Date.now() / 1000) + 60 * 60,
            },
        ],
        origins: [],
    };
    await writeFile(STORAGE_STATE_PATH, JSON.stringify(storageState, null, 2));
    console.info(`[admin global-setup] MONGODB_URI=${uri}; wrote storage state to ${STORAGE_STATE_PATH}`);
}

/**
 * Playwright globalTeardown: no-op. The mongo daemon is owned by the root
 * `posttest:e2e` lifecycle hook (postdev-mongo.ts), not by this file.
 *
 * @returns Immediately.
 */
export async function globalTeardown(): Promise<void> {}

import { writeFile } from 'node:fs/promises';
import { type StartedMongo, seedCanonical, startMongo } from '@nordcom/commerce-test-mongo';
import mongoose, { type Model, Schema } from 'mongoose';
import { encode } from 'next-auth/jwt';

import { STORAGE_STATE_PATH } from './fixtures/storage-state';

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

let handle: StartedMongo | null = null;

/**
 * Playwright globalSetup: boots an in-process MongoDB, seeds the canonical
 * demo tenant plus an admin Payload user, and writes a Next-Auth-v5 session
 * cookie so the admin shell loads pre-authenticated. Mirrors the previous
 * `e2e/fixtures/seed.ts` flow but sources the URI from `startMongo` instead
 * of an externally-provisioned MongoDB.
 *
 * @returns Resolves once seeding + storage state write complete.
 * @throws If `NEXTAUTH_SECRET` / `AUTH_SECRET` is unset (required to mint the
 *         session JWT) or the user seed transaction fails.
 */
export default async function globalSetup(): Promise<void> {
    const started = await startMongo();
    process.env.MONGODB_URI = started.uri;
    process.env.PAYLOAD_SECRET = process.env.PAYLOAD_SECRET ?? 'development-secret';
    handle = started;
    await seedCanonical(started.uri);

    const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
    if (!secret) throw new Error('[admin global-setup] NEXTAUTH_SECRET / AUTH_SECRET is required');

    const conn = await mongoose
        .createConnection(started.uri, {
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

        // Matching Payload user so getAuthedPayloadCtx can resolve the
        // NextAuth session to a Payload principal — without this every
        // content route redirects to /auth/login/.
        const PayloadUserModel: Model<PayloadUserDoc> =
            conn.models['payload-users'] ??
            conn.model<PayloadUserDoc>('payload-users', PayloadUserSchema, 'payload-users');

        const existingPayload = await PayloadUserModel.findOne({ email: TEST_EMAIL })
            .lean<{ _id: mongoose.Types.ObjectId }>()
            .exec();
        if (!existingPayload) {
            await PayloadUserModel.create({
                email: TEST_EMAIL,
                role: 'admin',
                tenants: [],
                loginAttempts: 0,
                sessions: [],
            });
        }
    } finally {
        await conn.close();
    }

    // Auth.js v5: with NEXTAUTH_URL unset the cookie name has no `__Secure-`
    // prefix and the cookie is not flagged secure. The salt must equal the
    // cookie name. See apps/admin/src/utils/auth.config.ts.
    const isSecure = !!process.env.NEXTAUTH_URL;
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
                domain: process.env.CI ? 'localhost' : 'admin.localhost',
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
    console.info(`[admin global-setup] MONGODB_URI=${started.uri}; wrote storage state to ${STORAGE_STATE_PATH}`);
}

/**
 * Playwright globalTeardown: stops the in-process MongoDB started by
 * `globalSetup`. Safe to call when `startMongo` was never reached.
 *
 * @returns Resolves once mongod has shut down.
 */
export async function globalTeardown(): Promise<void> {
    await handle?.stop();
}

/**
 * Playwright globalSetup — seeds the test-user document into MongoDB and
 * mints a NextAuth v5 session JWT so e2e tests can run as that user without
 * going through the GitHub OAuth flow.
 *
 * We connect directly via mongoose here instead of importing
 * @nordcom/commerce-db because that package's db.ts starts with
 * `import 'server-only'` which throws outside a Next.js server context.
 *
 * If MONGODB_URI is not set (e.g. local dev without a DB), this setup is a
 * no-op — the tests themselves will simply fail to load data, which is the
 * expected behavior when infrastructure is unavailable.
 */

import { writeFile } from 'node:fs/promises';
import mongoose, { type Model, Schema } from 'mongoose';
import { encode } from 'next-auth/jwt';

import { STORAGE_STATE_PATH } from './storage-state';

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

export default async function globalSetup(): Promise<void> {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.warn('[seed] MONGODB_URI is not set — skipping test-user seed.');
        return;
    }

    const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
    if (!secret) {
        console.warn('[seed] NEXTAUTH_SECRET / AUTH_SECRET is not set — skipping JWT mint.');
        return;
    }

    let connection: mongoose.Connection | undefined;
    let userId: string | undefined;
    try {
        const conn = await mongoose
            .createConnection(uri, {
                autoCreate: true,
                autoIndex: true,
                bufferCommands: false,
            })
            .asPromise();

        connection = conn;

        const UserModel: Model<UserDoc> = conn.models.User ?? conn.model<UserDoc>('User', UserSchema);

        const existing = await UserModel.findOne({ email: TEST_EMAIL }).lean<{ _id: mongoose.Types.ObjectId }>().exec();
        if (existing) {
            userId = existing._id.toString();
            console.info(`[seed] User "${TEST_EMAIL}" already exists.`);
        } else {
            const created = await UserModel.create({
                email: TEST_EMAIL,
                name: 'E2E Test User',
                avatar: null,
                identities: [],
                emailVerified: null,
            });
            if (!created) {
                throw new Error('[seed] UserModel.create returned null');
            }
            userId = created._id.toString();
            console.info(`[seed] Seeded user "${TEST_EMAIL}".`);
        }

        // Seed a matching Payload user so getAuthedPayloadCtx can resolve
        // the NextAuth session to a Payload principal. Without this, every
        // content route redirects back to /auth/login/ and editor-ui.spec.ts
        // times out. Grant admin role so the test user has access to all
        // tenants without requiring an explicit tenant-membership upsert.
        const PayloadUserModel: Model<PayloadUserDoc> =
            conn.models['payload-users'] ??
            conn.model<PayloadUserDoc>('payload-users', PayloadUserSchema, 'payload-users');

        const existingPayload = await PayloadUserModel.findOne({ email: TEST_EMAIL })
            .lean<{ _id: mongoose.Types.ObjectId }>()
            .exec();
        if (existingPayload) {
            console.info(`[seed] Payload user "${TEST_EMAIL}" already exists.`);
        } else {
            await PayloadUserModel.create({
                email: TEST_EMAIL,
                role: 'admin',
                tenants: [],
                loginAttempts: 0,
                sessions: [],
            });
            console.info(`[seed] Seeded Payload user "${TEST_EMAIL}" with role "admin".`);
        }
    } catch (err) {
        console.error('[seed] User seed failed:', err);
    } finally {
        await connection?.close();
    }

    if (!userId) {
        console.warn('[seed] No userId resolved — skipping JWT mint.');
        return;
    }

    // Auth.js v5: when NEXTAUTH_URL is unset (local + CI runs against
    // http://localhost:3000) the cookie name has no `__Secure-` prefix and
    // the cookie is not flagged secure. With NEXTAUTH_URL set, the
    // `__Secure-` prefix REQUIRES the secure flag — browsers reject the
    // cookie otherwise. Salt must equal the cookie name.
    // See apps/admin/src/utils/auth.config.ts.
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
    console.info(`[seed] Wrote storage state to ${STORAGE_STATE_PATH}.`);
}

// No teardown — the seeded user + storage state are reused across runs for
// speed, and CI databases are ephemeral so there is nothing to clean up.
// If a teardown is ever needed, export it from here and register it via
// `globalTeardown:` in playwright.config.ts (currently absent).

/**
 * Playwright globalSetup — seeds the test-user document into MongoDB.
 *
 * We connect directly via mongoose here instead of importing
 * @nordcom/commerce-db because that package's db.ts starts with
 * `import 'server-only'` which throws outside a Next.js server context.
 *
 * If MONGODB_URI is not set (e.g. local dev without a DB), this setup is a
 * no-op — the tests themselves will simply fail to load data, which is the
 * expected behaviour when infrastructure is unavailable.
 */

import mongoose, { Schema } from 'mongoose';

const TEST_EMAIL = 'e2e-test@example.com';

const UserSchema = new Schema(
    {
        email: {
            type: Schema.Types.String,
            required: true,
            unique: true,
        },
        name: {
            type: Schema.Types.String,
            required: true,
        },
        avatar: {
            type: Schema.Types.String,
            default: null,
        },
        identities: [
            {
                type: Schema.Types.Mixed,
                default: [],
            },
        ],
        emailVerified: {
            type: Schema.Types.Date,
            default: null,
        },
    },
    {
        id: true,
        timestamps: true,
    },
);

export default async function globalSetup(): Promise<void> {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.warn('[seed] MONGODB_URI is not set — skipping test-user seed.');
        return;
    }

    let connection: mongoose.Connection | undefined;
    try {
        const conn = await mongoose
            .createConnection(uri, {
                autoCreate: true,
                autoIndex: true,
                bufferCommands: false,
            })
            .asPromise();

        connection = conn;

        const UserModel = conn.models.User ?? conn.model('User', UserSchema);

        const existing = await UserModel.findOne({ email: TEST_EMAIL }).lean().exec();
        if (existing) {
            console.info(`[seed] User "${TEST_EMAIL}" already exists — skipping seed.`);
            return;
        }

        await UserModel.create({
            email: TEST_EMAIL,
            name: 'E2E Test User',
            avatar: null,
            identities: [],
            emailVerified: null,
        });

        console.info(`[seed] Seeded user "${TEST_EMAIL}" successfully.`);
    } catch (err) {
        console.error('[seed] Seed failed (tests may fail):', err);
    } finally {
        await connection?.close();
    }
}

export async function globalTeardown(): Promise<void> {
    // No teardown — keep the seeded document between runs for speed.
    // CI databases are ephemeral so there is nothing to clean up.
}

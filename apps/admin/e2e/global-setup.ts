import { writeFile } from 'node:fs/promises';

import { MissingEnvironmentVariableError, NotFoundError, UnknownShopDomainError } from '@nordcom/commerce-errors';
import { seedCanonical } from '@nordcom/commerce-test-convex';
import { ConvexHttpClient } from 'convex/browser';
import { type FunctionReference, makeFunctionReference } from 'convex/server';
import mongoose from 'mongoose';
import { encode } from 'next-auth/jwt';

import { STORAGE_STATE_PATH } from './fixtures/storage-state';

const TEST_EMAIL = 'e2e-test@example.com';

/** Hostname → shop server query — the SAME `db/shops` seam the admin shell resolves tenants through. */
export const shopByDomainRef = makeFunctionReference<'query'>('db/shops:byDomain');
/** Email → platform-user server query; the idempotency probe for the operator upsert. */
export const userByEmailRef = makeFunctionReference<'query'>('db/users:byEmail');
/** Platform-user insert backing the first-run operator seed (`users.by_email` unique-enforced). */
export const userCreateRef = makeFunctionReference<'mutation'>('db/users:create');
/** The single atomic shop write; its `collaborators` list delete-diff-syncs the `shopCollaborators` join. */
export const upsertShopRef = makeFunctionReference<'mutation'>('db/shop_write:upsertShop');

/** The narrow `byDomain` result surface the setup consumes (the wire erases the branded ids). */
type ShopByDomainView = { shop: { _id: string; legacyId: string } } | null;

/** The narrow `users` row surface the setup consumes from `byEmail`/`create`. */
type UserView = { _id: string };

/** The narrow `upsertShop` result surface — `null` means the keyed shop row vanished mid-setup. */
type ShopWriteView = { shop: { _id: string } } | null;

/** The slice of `ConvexHttpClient` the setup needs — kept minimal so unit tests can hand in a fake. */
export interface SetupConvexClient {
    query(reference: FunctionReference<'query'>, args: Record<string, unknown>): Promise<unknown>;
    mutation(reference: FunctionReference<'mutation'>, args: Record<string, unknown>): Promise<unknown>;
}

/**
 * The injectable substrate behind {@link seedE2eOperator}: the canonical Convex seed, a server-tier
 * client factory, and the pre-cutover Payload principal bridge — so the unit suite can mock every
 * transport and prove the seed sequence without a deployment or a mongod.
 */
export interface GlobalSetupDeps {
    convex: {
        /** Seeds the canonical tenant onto the deployment; resolves to the canonical `shops` doc id. */
        seed(url: string): Promise<string>;
        /** Builds a (server-tier) client for the deployment. */
        createClient(url: string): SetupConvexClient;
    };
    /** Mirrors the operator into the Payload `users` collection — see {@link seedPayloadPrincipal}. */
    seedPayloadPrincipal(uri: string, principal: { email: string; domain: string }): Promise<void>;
}

/**
 * Pre-cutover Payload principal seeding — the ONLY Mongo-side write left in this setup, and the only
 * reason `mongoose`/`MONGODB_URI` still appear in this file. The admin app under test still boots
 * Payload-on-Mongo, and `getAuthedPayloadCtx` (apps/admin/src/lib/payload-ctx.ts) resolves the
 * NextAuth email to a `payload-users` document — without this row every `[domain]` content route
 * bounces to `/auth/login/`. The `tenants` link carries the MONGO shop `_id` (shop == tenant
 * post-UNIFY-03; there is no separate `tenants` collection), looked up here because the Mongo seed
 * does not pin a stable shop id. TEARDOWN-02 deletes this function with the Payload surface.
 *
 * @param uri - The daemon mongod the admin webServer also binds to.
 * @param principal - The operator email plus the canonical shop domain to link as tenant.
 * @returns Resolves once the `payload-users` upsert lands.
 * @throws {NotFoundError} When the demo shop is missing on the Mongo side (predev-mongo seeds it).
 */
async function seedPayloadPrincipal(uri: string, principal: { email: string; domain: string }): Promise<void> {
    const conn = await mongoose.createConnection(uri, { bufferCommands: false }).asPromise();
    try {
        const shop = await conn.collection('shops').findOne({ domain: principal.domain });
        if (!shop) {
            throw new NotFoundError(`demo shop (${principal.domain})`);
        }
        const now = new Date();
        await conn.collection('payload-users').updateOne(
            { email: principal.email },
            {
                $set: {
                    role: 'admin',
                    tenants: [{ tenant: shop._id, id: String(shop._id) }],
                    updatedAt: now,
                },
                $setOnInsert: { email: principal.email, loginAttempts: 0, sessions: [], createdAt: now },
            },
            { upsert: true },
        );
    } finally {
        await conn.close();
    }
}

/** Production wiring: the real test-convex live seed, a real `ConvexHttpClient`, the real Payload bridge. */
const defaultDeps: GlobalSetupDeps = {
    convex: {
        seed: (url) => seedCanonical(url),
        createClient: (url) => new ConvexHttpClient(url),
    },
    seedPayloadPrincipal,
};

/**
 * The testable seed core of the Playwright globalSetup: ensures the canonical demo tenant exists on
 * the configured Convex deployment, resolves it through the `db/shops:byDomain` server seam, upserts
 * the e2e operator against the unified model (`users` keyed by `by_email`, then ONE
 * `db/shop_write:upsertShop` whose `collaborators` list syncs the `shopCollaborators` join the
 * shell's `Shop.findByCollaborator` reads), and finally mirrors the operator into the pre-cutover
 * Payload `users` collection. Idempotent end-to-end: the canonical seed heals partial corpora, the
 * user upsert is probe-then-create, and the collaborator sync is a delete-diff.
 *
 * @param env - The environment to read configuration from.
 * @param deps - The transport surface (injectable for unit tests).
 * @returns The operator's Convex `users` document id — the NextAuth JWT `sub`.
 * @throws {MissingEnvironmentVariableError} When `CONVEX_URL`/`NEXT_PUBLIC_CONVEX_URL`,
 *   `CONVEX_SERVER_SECRET`, or `MONGODB_URI` is unset — run via `pnpm test:e2e` so root `.env.local`
 *   loads.
 * @throws {UnknownShopDomainError} When the demo shop cannot be resolved after seeding.
 * @throws {NotFoundError} When the keyed shop row vanishes between the resolve and the write.
 */
export async function seedE2eOperator(
    env: NodeJS.ProcessEnv = process.env,
    deps: GlobalSetupDeps = defaultDeps,
): Promise<string> {
    const url = env.CONVEX_URL || env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) {
        throw new MissingEnvironmentVariableError('CONVEX_URL', 'Run via `pnpm test:e2e` so root .env.local loads.');
    }
    const serverSecret = env.CONVEX_SERVER_SECRET;
    if (!serverSecret) {
        throw new MissingEnvironmentVariableError(
            'CONVEX_SERVER_SECRET',
            'It must match the value set on the Convex deployment under test.',
        );
    }
    const mongoUri = env.MONGODB_URI;
    if (!mongoUri) {
        throw new MissingEnvironmentVariableError(
            'MONGODB_URI',
            'The admin app under test still boots Payload-on-Mongo pre-cutover (TEARDOWN-02 removes this).',
        );
    }

    await deps.convex.seed(url);

    const client = deps.convex.createClient(url);
    const domain = env.E2E_SHOP_DOMAIN ?? 'nordcom-demo-shop.com';
    const view = (await client.query(shopByDomainRef, { serverSecret, domain })) as ShopByDomainView;
    if (!view) {
        throw new UnknownShopDomainError(domain, 'The demo shop is missing after the canonical Convex seed.');
    }

    const existing = (await client.query(userByEmailRef, { serverSecret, email: TEST_EMAIL })) as UserView | null;
    const user =
        existing ??
        ((await client.mutation(userCreateRef, {
            serverSecret,
            email: TEST_EMAIL,
            name: 'E2E Test User',
            emailVerified: null,
            identities: [],
        })) as UserView);

    const written = (await client.mutation(upsertShopRef, {
        serverSecret,
        legacyId: view.shop.legacyId,
        shop: {},
        collaborators: [{ user: user._id, permissions: ['admin'] }],
    })) as ShopWriteView;
    if (!written) {
        throw new NotFoundError(`canonical shop (legacyId=${view.shop.legacyId})`);
    }

    await deps.seedPayloadPrincipal(mongoUri, { email: TEST_EMAIL, domain });
    return user._id;
}

/**
 * Playwright globalSetup: seeds the e2e operator (Convex-native — {@link seedE2eOperator}) and
 * writes a Next-Auth-v5 session cookie so the admin shell loads pre-authenticated. The cookie's
 * `sub` is the operator's Convex `users` id, which `auth.config.ts`'s jwt-strategy session callback
 * surfaces verbatim as `session.user.id`.
 *
 * @returns Resolves once seeding + storage state write complete.
 * @throws {MissingEnvironmentVariableError} When `NEXTAUTH_SECRET` / `AUTH_SECRET` (or any of the
 *   seed core's required variables) is unset.
 */
export default async function globalSetup(): Promise<void> {
    const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
    if (!secret) {
        throw new MissingEnvironmentVariableError('NEXTAUTH_SECRET', 'NEXTAUTH_SECRET / AUTH_SECRET is required.');
    }

    const userId = await seedE2eOperator();

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
    console.info(`[admin global-setup] seeded operator ${TEST_EMAIL}; wrote storage state to ${STORAGE_STATE_PATH}`);
}

/**
 * Playwright globalTeardown: no-op. The Convex deployment under test is owned by its launcher and
 * the daemon mongod by the root dev/test lifecycle hooks (postdev-mongo.ts), never by this file.
 *
 * @returns Immediately.
 */
export async function globalTeardown(): Promise<void> {}

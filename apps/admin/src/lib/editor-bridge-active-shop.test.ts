/**
 * POLISH-03 — the multi-shop operator flow proven end to end through the bridge: the REAL
 * `editor-convex-bridge` + `authenticateConvexClient` + RS256 `mintConvexOperatorToken` chain mints
 * the active-shop claim from the request's recorded selection, and the REAL Convex `cms/actions`
 * mutations (tenant tier → `resolveActiveAdminShopId`) running in `convex-test` resolve each call
 * to the selected tenant.
 *
 * Only the WIRE is substituted: the `@nordcom/commerce-db` transport DECODES the actually-minted
 * JWT and replays its claims as the `convex-test` identity (`withIdentity` fakes identities without
 * real signature validation, so the decode is the seam's honest equivalent), and the NextAuth
 * session + the request-scoped active-shop holder are test-controlled (React `cache()` has no
 * request scope under vitest).
 */
import { createUnitConvex } from '@nordcom/commerce-test-convex/unit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import schema from '../../../../packages/convex/convex/schema';

/** Harness + last-applied bearer token holder the hoisted module mocks read through. */
const h = vi.hoisted(() => ({
    harness: null as unknown,
}));

vi.mock('@/auth', () => ({
    auth: vi.fn(async () => ({
        user: { email: 'multi-operator@example.com', name: 'Multi Operator' },
        expires: '2099-01-01',
    })),
}));

// Test-controlled selection seam: the real module's request scoping rides React `cache()`, which
// memoizes nothing outside a server request, so the test substitutes a plain slot with the same
// contract and drives it exactly like `getAuthedCmsCtx` would per route.
vi.mock('./active-shop', () => {
    let current: string | undefined;
    return {
        setActiveShopSelection: (shopId: string | undefined) => {
            current = shopId;
        },
        getActiveShopSelection: () => current,
    };
});

// The identity-client transport — the ONLY substituted layer between the real bridge module and
// the real Convex functions: decode the REAL minted token and route the call into the convex-test
// harness under the identity (claims included) that token carries.
vi.mock('@nordcom/commerce-db', async () => {
    const { makeFunctionReference } = await import('convex/server');
    const { decodeJwt } = await import('jose');
    type Caller = {
        withIdentity: (identity: object) => {
            query: (ref: unknown, args: Record<string, unknown>) => Promise<unknown>;
            mutation: (ref: unknown, args: Record<string, unknown>) => Promise<unknown>;
        };
    };
    type MockClient = { token: string | null; setAuth: (token: string) => void; clearAuth: () => void };
    const callerFor = (client: unknown) => {
        const { token } = client as MockClient;
        if (!h.harness || !token) throw new TypeError('convex-test harness or bearer token not initialized');
        const payload = decodeJwt(token);
        // The claim key mirrors the resolver's ACTIVE_SHOP_CLAIM; `convex-token.test.ts` pins the
        // constants' equality, so a literal here cannot drift silently.
        const activeShop = payload.activeShop;
        return (h.harness as Caller).withIdentity({
            issuer: String(payload.iss),
            subject: String(payload.sub),
            email: payload.email,
            ...(typeof activeShop === 'string' ? { activeShop } : {}),
        });
    };
    return {
        createConvexIdentityClient: (): MockClient => ({
            token: null,
            setAuth(token: string) {
                this.token = token;
            },
            clearAuth() {
                this.token = null;
            },
        }),
        convexIdentityQuery: async (client: unknown, name: string, args: Record<string, unknown>) =>
            callerFor(client).query(makeFunctionReference<'query'>(name), args),
        convexIdentityMutation: async (client: unknown, name: string, args: Record<string, unknown>) =>
            callerFor(client).mutation(makeFunctionReference<'mutation'>(name), args),
    };
});

import { generateKeyPairSync } from 'node:crypto';
import { AdminShopResolverErrorCode } from '../../../../packages/convex/convex/auth/admin_shop_resolver';
import { AuthErrorCode } from '../../../../packages/convex/convex/lib/auth';
import { setActiveShopSelection } from './active-shop';
import { editorConvexBridge } from './editor-convex-bridge';

const TRUSTED_ISSUER = 'https://admin.polish.nordcom.io';
const OPERATOR_EMAIL = 'multi-operator@example.com';
const NOW = 1_700_000_000_000;

const PEM = generateKeyPairSync('rsa', { modulusLength: 2048 })
    .privateKey.export({ type: 'pkcs8', format: 'pem' })
    .toString();

/** The deployed Convex cms modules convex-test resolves the bridge's function names against. */
const modules = {
    '/convex/cms/actions.ts': () => import('../../../../packages/convex/convex/cms/actions'),
    '/convex/cms/documents.ts': () => import('../../../../packages/convex/convex/cms/documents'),
};

/**
 * Builds a fresh harness and seeds the multi-shop fixture: ONE operator collaborating (admin) on
 * shops A and B, plus a foreign shop the operator is NOT a member of.
 *
 * @returns The seeded shop ids as strings, keyed by their `legacyId` selectors.
 */
async function seedMultiShopOperator(): Promise<{ shopA: string; shopB: string }> {
    const t = createUnitConvex(schema, modules);
    h.harness = t;
    await Promise.all(Object.values(modules).map((load) => load()));
    return await t.run(async (ctx) => {
        const operator = await ctx.db.insert('users', {
            email: OPERATOR_EMAIL,
            name: 'Multi Operator',
            emailVerified: null,
            identities: [],
            createdAt: NOW,
            updatedAt: NOW,
        });
        /**
         * Inserts one shop row with the shared fixture shape.
         *
         * @param legacyId - The shop's external id (the active-shop selector).
         * @returns The created `shops` id.
         */
        const insertShop = (legacyId: string) =>
            ctx.db.insert('shops', {
                legacyId,
                name: legacyId,
                domain: `${legacyId.replace(/_/g, '-')}.example.com`,
                design: {
                    header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: legacyId } },
                    accents: [],
                },
                commerceProvider: { type: 'stripe', authentication: {} },
                createdAt: NOW,
                updatedAt: NOW,
            });
        const shopA = await insertShop('shop_a');
        const shopB = await insertShop('shop_b');
        await insertShop('shop_foreign');
        await ctx.db.insert('shopCollaborators', { shop: shopA, user: operator, permissions: ['admin'] });
        await ctx.db.insert('shopCollaborators', { shop: shopB, user: operator, permissions: ['admin'] });
        return { shopA: String(shopA), shopB: String(shopB) };
    });
}

/**
 * Reads the tenant owner of a live `cmsDocuments` row straight off the harness db.
 *
 * @param documentId - The bridge-returned document id.
 * @returns The owning `shopId` as a string, or `null` when the row does not exist.
 */
async function shopIdOfDocument(documentId: string): Promise<string | null> {
    const t = h.harness as { run: <T>(fn: (ctx: { db: unknown }) => Promise<T>) => Promise<T> };
    return await t.run(async (ctx) => {
        const db = ctx.db as { query: (table: string) => { collect: () => Promise<Array<Record<string, unknown>>> } };
        const rows = await db.query('cmsDocuments').collect();
        const row = rows.find((candidate) => String(candidate._id) === documentId);
        return row ? String(row.shopId) : null;
    });
}

beforeEach(() => {
    vi.stubEnv('CONVEX_AUTH_ISSUER', TRUSTED_ISSUER);
    vi.stubEnv('CONVEX_AUTH_APPLICATION_ID', 'convex-admin');
    vi.stubEnv('CONVEX_AUTH_PRIVATE_KEY', PEM);
    setActiveShopSelection(undefined);
});
afterEach(() => {
    vi.unstubAllEnvs();
});

describe('editorConvexBridge — multi-shop operator active-shop selection (POLISH-03)', () => {
    it('authors against shop A then shop B from the recorded selection, with no ambiguity error', async () => {
        const { shopA, shopB } = await seedMultiShopOperator();

        setActiveShopSelection('shop_a');
        const createdA = await editorConvexBridge.create({
            collection: 'pages',
            data: { title: 'Doc for shop A' },
            locale: 'en-US',
        });
        await expect(shopIdOfDocument(createdA.documentId)).resolves.toBe(shopA);

        setActiveShopSelection('shop_b');
        const createdB = await editorConvexBridge.create({
            collection: 'pages',
            data: { title: 'Doc for shop B' },
            locale: 'en-US',
        });
        await expect(shopIdOfDocument(createdB.documentId)).resolves.toBe(shopB);
    });

    it('still refuses a multi-shop operator with no recorded selection as ambiguous (back-compat)', async () => {
        await seedMultiShopOperator();

        await expect(
            editorConvexBridge.create({ collection: 'pages', data: { title: 'No selection' }, locale: 'en-US' }),
        ).rejects.toMatchObject({ data: { code: AuthErrorCode.AMBIGUOUS_SHOP_MEMBERSHIP } });
    });

    it('rejects a claim selecting a real shop the operator does not collaborate on', async () => {
        await seedMultiShopOperator();

        setActiveShopSelection('shop_foreign');
        await expect(
            editorConvexBridge.create({ collection: 'pages', data: { title: 'Forged' }, locale: 'en-US' }),
        ).rejects.toMatchObject({ data: { code: AdminShopResolverErrorCode.ACTIVE_SHOP_FORBIDDEN } });
    });
});

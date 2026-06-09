import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { systemMutation } from '../lib/system';
import schema from '../schema';
import type { CmsAuthContext } from './access';
import * as secrets from './secrets';

/** An authenticated admin principal (member of every tenant). */
const admin: CmsAuthContext = { role: 'admin', tenantIds: [] };

/**
 * Builds an authenticated editor principal confined to the given tenant ids.
 *
 * @param tenantIds - The tenant ids the editor collaborates on.
 * @returns A non-null editor {@link CmsAuthContext}.
 */
const editor = (tenantIds: string[]): CmsAuthContext => ({ role: 'editor', tenantIds });

/**
 * A shop-shaped read payload that — unlike the stored `Doc<'shops'>` — carries the two masked secret
 * paths, used to prove {@link secrets.stripShopSecrets} removes a secret should one ever be grafted on.
 *
 * @returns A shop-like object whose commerce-provider authentication holds a token and a clientSecret.
 */
const overShapedShop = () =>
    ({
        commerceProvider: {
            type: 'shopify',
            authentication: {
                token: 'SECRET',
                publicToken: 'public',
                customers: { id: 'c', clientId: 'ci', clientSecret: 'CS' },
            },
        },
    }) as unknown as Parameters<typeof secrets.stripShopSecrets>[0];

describe('shop secret pure helpers', () => {
    it('stripShopSecrets removes token + clientSecret and preserves public fields', () => {
        const out = secrets.stripShopSecrets(overShapedShop());
        const auth = (out.commerceProvider as { authentication: Record<string, unknown> }).authentication;
        expect(auth.token).toBeUndefined();
        expect(auth.publicToken).toBe('public');
        const customers = auth.customers as Record<string, unknown>;
        expect(customers.clientSecret).toBeUndefined();
        expect(customers.clientId).toBe('ci');
    });

    it('stripShopSecrets does not mutate its input', () => {
        const input = overShapedShop();
        secrets.stripShopSecrets(input);
        const auth = (input.commerceProvider as { authentication: Record<string, unknown> }).authentication;
        expect(auth.token).toBe('SECRET');
    });

    it('attachShopSecrets pairs the shop with its credentials, empty bag when absent', () => {
        const shop = { _id: 'shop_x' } as unknown as Parameters<typeof secrets.attachShopSecrets>[0];
        expect(secrets.attachShopSecrets(shop, { token: 't', clientSecret: 'cs' }).secrets).toEqual({
            token: 't',
            clientSecret: 'cs',
        });
        expect(secrets.attachShopSecrets(shop, null).secrets).toEqual({ token: undefined, clientSecret: undefined });
    });

    it('applySecretWritePolicy strips secret paths for non-admins, passes them through for admins', () => {
        const patch = {
            name: 'Acme',
            commerceProvider: { authentication: { token: 'NEW', customers: { clientSecret: 'NEW_CS' } } },
        };

        const adminOut = secrets.applySecretWritePolicy(admin, structuredCloneJson(patch));
        expect(adminOut.commerceProvider?.authentication?.token).toBe('NEW');
        expect(adminOut.commerceProvider?.authentication?.customers?.clientSecret).toBe('NEW_CS');

        const editorOut = secrets.applySecretWritePolicy(editor(['shop_x']), structuredCloneJson(patch));
        expect(editorOut.name).toBe('Acme');
        expect(editorOut.commerceProvider?.authentication?.token).toBeUndefined();
        expect(editorOut.commerceProvider?.authentication?.customers?.clientSecret).toBeUndefined();

        const anonOut = secrets.applySecretWritePolicy(null, structuredCloneJson(patch));
        expect(anonOut.commerceProvider?.authentication?.token).toBeUndefined();
    });
});

/**
 * JSON deep-clone helper so each `applySecretWritePolicy` case starts from an independent patch (the
 * function clones internally, but the admin path returns its input by reference).
 *
 * @param value - The value to clone.
 * @returns A structural copy of the value.
 */
function structuredCloneJson<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * The trusted NextAuth issuer the tenant/system resolvers assert against (via `resolveAdminShopId`).
 * Stubbed so the issuer check is active under `convex-test`, whose `withIdentity` fakes identities
 * WITHOUT Convex's real signature/issuer validation.
 */
const TRUSTED_ISSUER = 'https://admin.test.nordcom.io';

/** Fixed epoch-ms stamp for seeded rows' managed timestamps; its value is irrelevant to the assertions. */
const NOW = 1_700_000_000_000;

/**
 * Seeds two isolated operators with shredded secrets: operator A is an admin on shop A and operator B
 * an editor on shop B, each shop owning a `shopCredentials` row holding a distinct token + clientSecret.
 * The shop rows carry only NON-secret commerce-provider fields, mirroring the CONVEXCORE-04 shred.
 *
 * @returns The seeded shop ids keyed by operator role.
 */
const seedOperators = systemMutation({
    args: { adminEmail: v.string(), editorEmail: v.string() },
    handler: async (ctx, { adminEmail, editorEmail }) => {
        /**
         * Inserts one operator user, one shop (NON-secret commerce fields only), its split-out
         * credentials row, and a collaborator row granting the given permissions.
         *
         * @param email - The operator's identity email claim.
         * @param tag - A short tag seeding the shop's legacy id, domain, and secret values.
         * @param permissions - The collaboration permissions (drives the resolved CMS role).
         * @returns The created shop id.
         */
        const seed = async (email: string, tag: string, permissions: string[]) => {
            const userId = await ctx.db.insert('users', {
                email,
                name: 'Operator',
                emailVerified: null,
                identities: [],
                createdAt: NOW,
                updatedAt: NOW,
            });
            const shopId = await ctx.db.insert('shops', {
                legacyId: `shop_${tag}`,
                name: `shop_${tag}`,
                domain: `${tag}.example.com`,
                design: {
                    header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: tag } },
                    accents: [],
                },
                commerceProvider: {
                    type: 'shopify',
                    authentication: {
                        publicToken: `pub_${tag}`,
                        domain: `${tag}.myshopify.com`,
                        customers: { id: `cust_${tag}`, clientId: `cid_${tag}` },
                    },
                    storefrontId: `sf_${tag}`,
                    domain: `${tag}.example.com`,
                    id: `gid_${tag}`,
                },
                createdAt: NOW,
                updatedAt: NOW,
            });
            await ctx.db.insert('shopCredentials', {
                shop: shopId,
                token: `SECRET_TOKEN_${tag}`,
                clientSecret: `SECRET_CS_${tag}`,
            });
            await ctx.db.insert('shopCollaborators', { shop: shopId, user: userId, permissions });
            return shopId;
        };

        const shopAId = await seed(adminEmail, 'A', ['admin']);
        const shopBId = await seed(editorEmail, 'B', []);
        return { shopAId, shopBId };
    },
});

/**
 * Hand-built `convex-test` module map (see `lib/system.test.ts` for the rationale): the default glob
 * excludes the self-importing test module, so the seed fixture and the real `cms/secrets` functions are
 * mapped by path so they resolve by `FunctionReference`.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/cms/secrets.ts': () => Promise.resolve(secrets),
    '/convex/cms/secrets.test.ts': () => Promise.resolve({ seedOperators }),
};

const seedOperatorsRef = makeFunctionReference<'mutation'>('cms/secrets.test:seedOperators');
const readMaskedShopRef = makeFunctionReference<'query'>('cms/secrets:readMaskedShop');
const sensitiveShopReadRef = makeFunctionReference<'query'>('cms/secrets:sensitiveShopRead');

const asOperator = (t: ReturnType<typeof convexTest>, email: string, subject: string) =>
    t.withIdentity({ issuer: TRUSTED_ISSUER, subject, email });

describe('shop secret exposure boundary', () => {
    beforeEach(() => {
        vi.stubEnv('CONVEX_AUTH_ISSUER', TRUSTED_ISSUER);
    });
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('readMaskedShop never returns token/clientSecret on the wire for a non-admin', async () => {
        const t = convexTest(schema, modules);
        const { shopBId } = await t.mutation(seedOperatorsRef, {
            adminEmail: 'admin@example.com',
            editorEmail: 'editor@example.com',
        });

        const masked = await asOperator(t, 'editor@example.com', 'github|editor').query(readMaskedShopRef, {});

        expect(masked).not.toBeNull();
        expect(masked?._id).toBe(shopBId);
        // The shredded secrets exist in shopCredentials, yet never reach this public read's wire payload.
        const serialized = JSON.stringify(masked);
        expect(serialized).not.toContain('SECRET_TOKEN_B');
        expect(serialized).not.toContain('SECRET_CS_B');
        const auth = (masked?.commerceProvider as { authentication?: Record<string, unknown> }).authentication;
        expect(auth?.token).toBeUndefined();
        expect(auth?.publicToken).toBe('pub_B');
        expect((auth?.customers as Record<string, unknown> | undefined)?.clientId).toBe('cid_B');
    });

    it('sensitiveShopRead exposes the secrets ONLY from the server-trusted context, scoped to the caller', async () => {
        const t = convexTest(schema, modules);
        const { shopAId, shopBId } = await t.mutation(seedOperatorsRef, {
            adminEmail: 'admin@example.com',
            editorEmail: 'editor@example.com',
        });

        const sensitiveA = await asOperator(t, 'admin@example.com', 'github|admin').query(sensitiveShopReadRef, {});
        expect(sensitiveA.shop._id).toBe(shopAId);
        expect(sensitiveA.secrets).toEqual({ token: 'SECRET_TOKEN_A', clientSecret: 'SECRET_CS_A' });

        // Operator B's identity pins the read to shop B — it can NEVER surface shop A's secrets.
        const sensitiveB = await asOperator(t, 'editor@example.com', 'github|editor').query(sensitiveShopReadRef, {});
        expect(sensitiveB.shop._id).toBe(shopBId);
        expect(sensitiveB.secrets.token).toBe('SECRET_TOKEN_B');
        expect(sensitiveB.secrets.token).not.toBe('SECRET_TOKEN_A');
    });

    it('sensitiveShopRead rejects an unauthenticated caller (no server-trusted identity)', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedOperatorsRef, { adminEmail: 'admin@example.com', editorEmail: 'editor@example.com' });

        await expect(t.query(sensitiveShopReadRef, {})).rejects.toThrow('UNAUTHENTICATED');
    });
});

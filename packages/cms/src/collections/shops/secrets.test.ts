import { describe, expect, it } from 'vitest';
import {
    mayReadShopSecrets,
    mayWriteShopSecrets,
    rejectSecretWritesFromNonAdmins,
    SHOP_SECRET_PATHS,
    stripSecretsOnRead,
} from './secrets';

type AnyHook = (args: Record<string, unknown>) => Promise<unknown>;

const makeDoc = () => ({
    id: 'shop-1',
    commerceProvider: {
        authentication: {
            token: 'SECRET',
            publicToken: 'public',
            customers: { id: 'c', clientId: 'ci', clientSecret: 'CS' },
        },
    },
});

describe('stripSecretsOnRead', () => {
    it('returns the doc untouched for admin users', async () => {
        const doc = makeDoc();
        const out = (await (stripSecretsOnRead as unknown as AnyHook)({
            req: { user: { role: 'admin' } },
            doc,
        })) as typeof doc;
        expect(out.commerceProvider.authentication.token).toBe('SECRET');
        expect(out.commerceProvider.authentication.customers.clientSecret).toBe('CS');
    });

    it('strips token + clientSecret for non-admin authenticated users', async () => {
        const doc = makeDoc();
        const out = (await (stripSecretsOnRead as unknown as AnyHook)({
            req: { user: { role: 'editor' } },
            doc,
        })) as typeof doc;
        expect((out.commerceProvider.authentication as Record<string, unknown>).token).toBeUndefined();
        expect((out.commerceProvider.authentication.customers as Record<string, unknown>).clientSecret).toBeUndefined();
        expect(out.commerceProvider.authentication.publicToken).toBe('public');
    });

    it('strips secrets when no user is set without a trusted context flag', async () => {
        const doc = makeDoc();
        const out = (await (stripSecretsOnRead as unknown as AnyHook)({
            req: {},
            doc,
        })) as typeof doc;
        expect((out.commerceProvider.authentication as Record<string, unknown>).token).toBeUndefined();
    });

    it('preserves secrets for trusted server-side reads (context.sensitiveShopRead)', async () => {
        const doc = makeDoc();
        const out = (await (stripSecretsOnRead as unknown as AnyHook)({
            req: { context: { sensitiveShopRead: true } },
            doc,
        })) as typeof doc;
        expect(out.commerceProvider.authentication.token).toBe('SECRET');
        expect(out.commerceProvider.authentication.customers.clientSecret).toBe('CS');
    });

    it('still strips for non-admin users even when context flag is missing', async () => {
        const doc = makeDoc();
        const out = (await (stripSecretsOnRead as unknown as AnyHook)({
            req: { user: { role: 'editor' }, context: {} },
            doc,
        })) as typeof doc;
        expect((out.commerceProvider.authentication as Record<string, unknown>).token).toBeUndefined();
    });
});

describe('rejectSecretWritesFromNonAdmins', () => {
    it('passes data through unchanged for admin users', async () => {
        const data = { commerceProvider: { authentication: { token: 'NEW' } } };
        const originalDoc = { commerceProvider: { authentication: { token: 'OLD' } } };
        const out = (await (rejectSecretWritesFromNonAdmins as unknown as AnyHook)({
            req: { user: { role: 'admin' } },
            data,
            originalDoc,
        })) as typeof data;
        expect(out.commerceProvider.authentication.token).toBe('NEW');
    });

    it('reverts token writes for non-admin users', async () => {
        const data = { commerceProvider: { authentication: { token: 'NEW' } } };
        const originalDoc = { commerceProvider: { authentication: { token: 'OLD' } } };
        const out = (await (rejectSecretWritesFromNonAdmins as unknown as AnyHook)({
            req: { user: { role: 'editor' } },
            data,
            originalDoc,
        })) as typeof data;
        expect(out.commerceProvider.authentication.token).toBe('OLD');
    });
});

describe('secret access predicates (overrideAccess parity)', () => {
    it('names exactly the two masked secret paths', () => {
        expect(SHOP_SECRET_PATHS).toEqual([
            'commerceProvider.authentication.token',
            'commerceProvider.authentication.customers.clientSecret',
        ]);
    });

    it('mayReadShopSecrets exposes secrets to admins and trusted server-side syncs only', () => {
        expect(mayReadShopSecrets({ user: { role: 'admin' } })).toBe(true);
        expect(mayReadShopSecrets({ context: { sensitiveShopRead: true } })).toBe(true);
        expect(mayReadShopSecrets({ user: { role: 'editor' } })).toBe(false);
        expect(mayReadShopSecrets({ user: { role: 'editor' }, context: { sensitiveShopRead: false } })).toBe(false);
        expect(mayReadShopSecrets({})).toBe(false);
        expect(mayReadShopSecrets(undefined)).toBe(false);
    });

    it('mayWriteShopSecrets allows only admins (the context flag never grants writes)', () => {
        expect(mayWriteShopSecrets({ user: { role: 'admin' } })).toBe(true);
        expect(mayWriteShopSecrets({ user: { role: 'editor' }, context: { sensitiveShopRead: true } })).toBe(false);
        expect(mayWriteShopSecrets({})).toBe(false);
        expect(mayWriteShopSecrets(undefined)).toBe(false);
    });
});

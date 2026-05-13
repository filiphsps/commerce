import { describe, expect, it, vi } from 'vitest';
import type { AuthStrategy } from 'payload';
import { buildUsers } from './build-users';

const fakeStrategy: AuthStrategy = {
    name: 'fake',
    authenticate: async () => ({ user: null }),
};

describe('buildUsers', () => {
    it('returns a "users" collection with email-titled admin view', () => {
        const cfg = buildUsers();
        expect(cfg.slug).toBe('users');
        expect(cfg.admin).toMatchObject({ useAsTitle: 'email' });
    });

    it('forwards custom auth strategies', () => {
        const cfg = buildUsers({ authStrategies: [fakeStrategy] });
        const strategies = (cfg.auth as { strategies?: AuthStrategy[] }).strategies;
        expect(strategies).toEqual([fakeStrategy]);
    });

    it('disables the password login flow but keeps email/auth fields enabled when disablePasswordLogin is true', () => {
        // We use the object form `{ enableFields: true }` rather than the boolean form so the
        // email field stays in the schema — the NextAuth bridge needs to query users by email.
        const cfg = buildUsers({ authStrategies: [fakeStrategy], disablePasswordLogin: true });
        const auth = cfg.auth as { disableLocalStrategy?: boolean | { enableFields?: boolean } };
        expect(auth.disableLocalStrategy).toEqual({ enableFields: true });
    });

    it('leaves disableLocalStrategy undefined by default', () => {
        const cfg = buildUsers();
        expect(
            (cfg.auth as { disableLocalStrategy?: boolean | { enableFields?: boolean } })
                .disableLocalStrategy,
        ).toBeUndefined();
    });

    it('routes Payload users to a dedicated MongoDB collection via dbName', () => {
        // Storing Payload users in the same physical `users` collection as
        // `@nordcom/commerce-db`'s Mongoose User model would create a schema
        // conflict (the latter requires `identities[].identity`). `dbName`
        // isolates Payload's storage while keeping the slug `users` intact.
        const cfg = buildUsers();
        expect(cfg.dbName).toBe('payload-users');
    });

    it('declares a required role field with admin/editor options and editor default', () => {
        const cfg = buildUsers();
        const role = (cfg.fields ?? []).find((f) => 'name' in f && f.name === 'role') as Extract<
            NonNullable<(typeof cfg.fields)[number]>,
            { type: 'select' }
        >;
        expect(role.required).toBe(true);
        expect(role.defaultValue).toBe('editor');
        const values = role.options.map((o) =>
            typeof o === 'string' ? o : (o as { value: string }).value,
        );
        expect(values).toEqual(['admin', 'editor']);
    });

    it('restricts role updates to admins via field-level access', () => {
        const cfg = buildUsers();
        const role = (cfg.fields ?? []).find((f) => 'name' in f && f.name === 'role') as Extract<
            NonNullable<(typeof cfg.fields)[number]>,
            { type: 'select' }
        > & { access?: { update?: (args: { req: { user?: { role?: string } } }) => boolean } };
        const update = role.access?.update;
        expect(update?.({ req: { user: { role: 'admin' } } })).toBe(true);
        expect(update?.({ req: { user: { role: 'editor' } } })).toBeFalsy();
        expect(update?.({ req: {} } as never)).toBeFalsy();
    });

    describe('access predicates', () => {
        const cfg = buildUsers();
        const readAccess = cfg.access?.read as
            | ((args: { req: { user?: { id: string; role?: string } | null } }) => unknown)
            | undefined;
        const updateAccess = cfg.access?.update as typeof readAccess;
        const createAccess = cfg.access?.create as
            | ((args: { req: { user?: { role?: string } | null } }) => boolean)
            | undefined;
        const deleteAccess = cfg.access?.delete as typeof createAccess;

        it('public (no user) cannot read users', () => {
            expect(readAccess?.({ req: { user: null } })).toBe(false);
        });

        it('admin sees all users (read returns true)', () => {
            expect(readAccess?.({ req: { user: { id: 'u-admin', role: 'admin' } } })).toBe(true);
        });

        it('editor only sees themselves (read returns { id: { equals: <self> } })', () => {
            expect(readAccess?.({ req: { user: { id: 'u-1', role: 'editor' } } })).toEqual({
                id: { equals: 'u-1' },
            });
        });

        it('editor can only update themselves', () => {
            expect(updateAccess?.({ req: { user: { id: 'u-1', role: 'editor' } } })).toEqual({
                id: { equals: 'u-1' },
            });
        });

        it('create is admin-only', () => {
            expect(createAccess?.({ req: { user: { role: 'admin' } } })).toBe(true);
            expect(createAccess?.({ req: { user: { role: 'editor' } } })).toBeFalsy();
            expect(createAccess?.({ req: { user: null } })).toBeFalsy();
        });

        it('delete is admin-only', () => {
            expect(deleteAccess?.({ req: { user: { role: 'admin' } } })).toBe(true);
            expect(deleteAccess?.({ req: { user: { role: 'editor' } } })).toBeFalsy();
            expect(deleteAccess?.({ req: { user: null } })).toBeFalsy();
        });
    });

    it('admin panel is accessible to any logged-in user', () => {
        const cfg = buildUsers();
        const adminAccess = cfg.access?.admin as
            | ((args: { req: { user?: unknown } }) => boolean)
            | undefined;
        expect(adminAccess?.({ req: { user: { id: 'x' } } })).toBe(true);
        expect(adminAccess?.({ req: { user: null } })).toBe(false);
    });

    it('does not add a "tenants" field — that is left to the multi-tenant plugin', () => {
        const cfg = buildUsers();
        const tenants = (cfg.fields ?? []).find((f) => 'name' in f && f.name === 'tenants');
        expect(tenants).toBeUndefined();
    });

    it('returns a fresh config each call (no shared mutable state)', () => {
        const a = buildUsers();
        const b = buildUsers();
        expect(a).not.toBe(b);
        void vi; // satisfy import
    });
});

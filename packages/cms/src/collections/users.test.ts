import type { Field } from 'payload';
import { describe, expect, it } from 'vitest';
import { users } from './users';

// Pure config introspection. The shape of `buildUsers()` (auth strategies,
// access predicates, role gating, dbName isolation) is covered by
// `build-users.test.ts` — this file just verifies the default export wires up.
describe('users collection (default export)', () => {
    const fields = (users.fields ?? []) as Field[];
    const byName = (name: string) => fields.find((f): f is Field & { name: string } => 'name' in f && f.name === name);

    it('exposes slug "users"', () => {
        expect(users.slug).toBe('users');
    });

    it("routes to the `payload-users` Mongo collection so it cannot collide with `@nordcom/commerce-db`'s User model", () => {
        expect(users.dbName).toBe('payload-users');
    });

    it('declares the role field (required) — the multi-tenant plugin owns `tenants`', () => {
        expect(byName('role')).toMatchObject({ required: true });
        expect(byName('tenants')).toBeUndefined();
    });
});

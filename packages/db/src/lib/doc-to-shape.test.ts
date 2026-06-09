import { describe, expect, it } from 'vitest';

import { docToIdentity, docToOnlineShop, docToSession, docToUser, stripInternals } from './doc-to-shape';

const NOW = 1_700_000_000_000;

describe('stripInternals', () => {
    it('drops the top-level _id, __v, and _creationTime keys', () => {
        const result = stripInternals({ _id: 'x', __v: 0, _creationTime: NOW, name: 'n' });
        expect(result).not.toHaveProperty('_id');
        expect(result).not.toHaveProperty('__v');
        expect(result).not.toHaveProperty('_creationTime');
        expect(result).toMatchObject({ name: 'n' });
    });

    it('projects legacyId onto the string id (the public-id contract) and consumes it', () => {
        const result = stripInternals({ _id: 'cvx-1', legacyId: 'legacy-1', name: 'n' });
        expect(result.id).toBe('legacy-1');
        expect(result).not.toHaveProperty('legacyId');
    });

    it('falls back to the stringified _id when no legacyId exists (auth rows)', () => {
        const result = stripInternals({ _id: 'cvx-1', name: 'n' });
        expect(result.id).toBe('cvx-1');
    });

    it('preserves an existing top-level id over both legacyId and _id', () => {
        const result = stripInternals({ _id: 'cvx-1', legacyId: 'legacy-1', id: 'existing', name: 'n' });
        expect(result.id).toBe('existing');
    });

    it('rehydrates epoch-ms managed timestamps into Dates', () => {
        const result = stripInternals({ _id: 'x', createdAt: NOW, updatedAt: NOW + 1 }) as Record<string, unknown>;
        expect(result.createdAt).toEqual(new Date(NOW));
        expect(result.updatedAt).toEqual(new Date(NOW + 1));
    });

    it('recursively strips internals from nested subdocuments', () => {
        const result = stripInternals({
            _id: 'top',
            commerce: { _id: 'sub-1', __v: 0, maxQuantity: 5 },
            design: { _creationTime: NOW, header: { _id: 'sub-3', logo: { _id: 'sub-4', src: '/l' } } },
        }) as Record<string, unknown>;
        const commerce = result.commerce as Record<string, unknown>;
        expect(commerce).not.toHaveProperty('_id');
        expect(commerce).not.toHaveProperty('__v');
        expect(commerce).toMatchObject({ maxQuantity: 5 });
        const design = result.design as { header: { logo: Record<string, unknown> } };
        expect(design).not.toHaveProperty('_creationTime');
        expect(design.header).not.toHaveProperty('_id');
        expect(design.header.logo).not.toHaveProperty('_id');
        expect(design.header.logo).toMatchObject({ src: '/l' });
    });

    it('strips internals from objects nested inside arrays', () => {
        const result = stripInternals({
            _id: 'top',
            collaborators: [
                { _id: 'a', user: 'u1' },
                { _creationTime: NOW, user: 'u2' },
            ],
        }) as { collaborators: Array<Record<string, unknown>> };
        expect(result.collaborators[0]).not.toHaveProperty('_id');
        expect(result.collaborators[1]).not.toHaveProperty('_creationTime');
        expect(result.collaborators[0]).toMatchObject({ user: 'u1' });
    });

    it('leaves non-plain object values (e.g. Date) untouched', () => {
        const date = new Date('2026-01-01T00:00:00Z');
        const result = stripInternals({ _id: 'top', createdAt: date }) as Record<string, unknown>;
        expect(result.createdAt).toBe(date);
    });
});

describe('docToOnlineShop', () => {
    it('strips nested internals so the result is safe to pass to Client Components', () => {
        const result = docToOnlineShop({
            _id: 'top',
            legacyId: 'shop-1',
            name: 'Acme',
            domain: 'acme.test',
            commerce: { _id: 'sub-commerce', maxQuantity: 199_999, processingTimeInDays: 5 },
            commerceProvider: {
                _id: 'sub-cp',
                type: 'shopify',
                authentication: { _id: 'sub-auth', token: 'SECRET', publicToken: 'pt' },
            },
        }) as unknown as Record<string, unknown>;

        const commerce = result.commerce as Record<string, unknown>;
        expect(commerce).not.toHaveProperty('_id');
        expect(commerce).toMatchObject({ maxQuantity: 199_999, processingTimeInDays: 5 });

        const cp = result.commerceProvider as Record<string, unknown>;
        expect(cp).not.toHaveProperty('_id');
        expect(result.id).toBe('shop-1');
    });

    it('defensively masks token and customers.clientSecret even when attached upstream', () => {
        const result = docToOnlineShop({
            _id: 'top',
            commerceProvider: {
                type: 'shopify',
                authentication: {
                    token: 'SECRET',
                    publicToken: 'pt',
                    customers: { id: 'c', clientId: 'ci', clientSecret: 'CS' },
                },
            },
        }) as unknown as { commerceProvider: { authentication: Record<string, unknown> } };

        const auth = result.commerceProvider.authentication;
        expect(auth.token).toBeUndefined();
        expect(auth.publicToken).toBe('pt');
        expect((auth.customers as Record<string, unknown>).clientSecret).toBeUndefined();
        expect((auth.customers as Record<string, unknown>).clientId).toBe('ci');
    });
});

describe('docToUser', () => {
    it('rehydrates emailVerified and embedded identity dates', () => {
        const user = docToUser({
            _id: 'usr-1',
            email: 'a@b.c',
            name: 'A',
            emailVerified: NOW,
            identities: [
                { id: 'idn-1', provider: 'github', identity: '42', expiresAt: NOW, createdAt: NOW, updatedAt: NOW },
            ],
            createdAt: NOW,
            updatedAt: NOW,
        });

        expect(user.id).toBe('usr-1');
        expect(user.emailVerified).toEqual(new Date(NOW));
        expect(user.identities[0]?.expiresAt).toEqual(new Date(NOW));
        expect(user.identities[0]?.createdAt).toEqual(new Date(NOW));
    });

    it('keeps a null emailVerified null (the adapter contract)', () => {
        const user = docToUser({ _id: 'usr-1', email: 'a@b.c', name: 'A', emailVerified: null, identities: [] });
        expect(user.emailVerified).toBeNull();
    });
});

describe('docToIdentity', () => {
    it('projects the row id and rehydrates the optional expiry', () => {
        const identity = docToIdentity({
            _id: 'idn-1',
            provider: 'github',
            identity: '42',
            expiresAt: NOW,
            createdAt: NOW,
            updatedAt: NOW,
        });
        expect(identity.id).toBe('idn-1');
        expect(identity.expiresAt).toEqual(new Date(NOW));
        expect(identity).not.toHaveProperty('_id');
    });
});

describe('docToSession', () => {
    it('replaces the stored user reference with the populated UserBase', () => {
        const session = docToSession({
            session: { _id: 'ses-1', user: 'usr-1', token: 't', expiresAt: NOW, createdAt: NOW, updatedAt: NOW },
            user: { _id: 'usr-1', email: 'a@b.c', name: 'A', emailVerified: null, identities: [] },
        });

        expect(session.id).toBe('ses-1');
        expect(session.expiresAt).toEqual(new Date(NOW));
        expect(session.user).toMatchObject({ id: 'usr-1', email: 'a@b.c' });
    });
});

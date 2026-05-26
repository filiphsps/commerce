import { describe, expect, it } from 'vitest';

import { docToOnlineShop, stripInternals } from './doc-to-shape';

describe('stripInternals', () => {
    it('drops the top-level _id and __v keys', () => {
        const result = stripInternals({ _id: 'x', __v: 0, name: 'n' });
        expect(result).not.toHaveProperty('_id');
        expect(result).not.toHaveProperty('__v');
        expect(result).toMatchObject({ name: 'n' });
    });

    it('projects a top-level _id into a string id', () => {
        const result = stripInternals({ _id: 'mongo-id', name: 'n' });
        expect(result.id).toBe('mongo-id');
    });

    it('preserves an existing top-level id', () => {
        const result = stripInternals({ _id: 'mongo-id', id: 'existing', name: 'n' });
        expect(result.id).toBe('existing');
    });

    it('recursively strips _id and __v from nested subdocuments', () => {
        const result = stripInternals({
            _id: 'top',
            commerce: { _id: 'sub-1', __v: 0, maxQuantity: 5 },
            design: { _id: 'sub-2', header: { _id: 'sub-3', logo: { _id: 'sub-4', src: '/l' } } },
        }) as Record<string, unknown>;
        const commerce = result.commerce as Record<string, unknown>;
        expect(commerce).not.toHaveProperty('_id');
        expect(commerce).not.toHaveProperty('__v');
        expect(commerce).toMatchObject({ maxQuantity: 5 });
        const design = result.design as { header: { logo: Record<string, unknown> } };
        expect(design).not.toHaveProperty('_id');
        expect(design.header).not.toHaveProperty('_id');
        expect(design.header.logo).not.toHaveProperty('_id');
        expect(design.header.logo).toMatchObject({ src: '/l' });
    });

    it('strips _id from objects nested inside arrays', () => {
        const result = stripInternals({
            _id: 'top',
            collaborators: [
                { _id: 'a', user: 'u1' },
                { _id: 'b', user: 'u2' },
            ],
        }) as { collaborators: Array<Record<string, unknown>> };
        expect(result.collaborators[0]).not.toHaveProperty('_id');
        expect(result.collaborators[1]).not.toHaveProperty('_id');
        expect(result.collaborators[0]).toMatchObject({ user: 'u1' });
    });

    it('leaves non-plain object values (e.g. Date) untouched', () => {
        const date = new Date('2026-01-01T00:00:00Z');
        const result = stripInternals({ _id: 'top', createdAt: date }) as Record<string, unknown>;
        expect(result.createdAt).toBe(date);
    });
});

describe('docToOnlineShop', () => {
    it('strips nested subdoc _ids so the result is safe to pass to Client Components', () => {
        const result = docToOnlineShop({
            _id: 'top',
            name: 'Acme',
            domain: 'acme.test',
            commerce: { _id: 'sub-commerce', maxQuantity: 199_999, processingTimeInDays: 5 },
            commerceProvider: {
                _id: 'sub-cp',
                type: 'shopify',
                authentication: { _id: 'sub-auth', token: 'SECRET', publicToken: 'pt' },
            },
        }) as Record<string, unknown>;

        const commerce = result.commerce as Record<string, unknown>;
        expect(commerce).not.toHaveProperty('_id');
        expect(commerce).toMatchObject({ maxQuantity: 199_999, processingTimeInDays: 5 });

        const cp = result.commerceProvider as Record<string, unknown>;
        expect(cp).not.toHaveProperty('_id');
        const auth = cp.authentication as Record<string, unknown>;
        expect(auth).not.toHaveProperty('_id');
        expect(auth).not.toHaveProperty('token');
        expect(auth).toMatchObject({ publicToken: 'pt' });
    });
});

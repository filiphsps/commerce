import { describe, expect, it, vi } from 'vitest';

const mockFindByCollaborator = vi.fn();

vi.mock('@nordcom/commerce-db', () => ({
    Shop: { findByCollaborator: mockFindByCollaborator },
}));

const { getShopsForUser } = await import('./shops-for-user');

describe('getShopsForUser', () => {
    it('scopes the switcher to the operator’s collaborated shops', async () => {
        mockFindByCollaborator.mockResolvedValue([
            { name: 'Alpha', domain: 'alpha.example' },
            { name: 'Beta', domain: 'beta.example' },
        ]);

        const result = await getShopsForUser('user-123');

        expect(mockFindByCollaborator).toHaveBeenCalledWith({ collaboratorId: 'user-123' });
        expect(result).toEqual([
            { name: 'Alpha', domain: 'alpha.example' },
            { name: 'Beta', domain: 'beta.example' },
        ]);
    });

    it('returns no shops for an operator with no memberships', async () => {
        mockFindByCollaborator.mockResolvedValue([]);

        await expect(getShopsForUser('nobody')).resolves.toEqual([]);
    });
});

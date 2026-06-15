import { describe, expect, it } from 'vitest';

import { gravatarUrl } from './gravatar';

describe('gravatarUrl', () => {
    it('builds a gravatar URL with a 64-char SHA-256 hash and default params', () => {
        const url = gravatarUrl('person@example.com');
        const match = url.match(/^https:\/\/www\.gravatar\.com\/avatar\/([a-f0-9]{64})\?(.+)$/);
        expect(match).not.toBeNull();
        expect(url).toContain('d=mp');
        expect(url).toContain('s=160');
    });

    it('normalizes case and surrounding whitespace before hashing', () => {
        expect(gravatarUrl('  Person@Example.com ')).toBe(gravatarUrl('person@example.com'));
    });

    it('honors size and default-image overrides', () => {
        const url = gravatarUrl('person@example.com', { size: 64, defaultImage: 'identicon' });
        expect(url).toContain('s=64');
        expect(url).toContain('d=identicon');
    });
});

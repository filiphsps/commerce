import { describe, expect, it } from 'vitest';
import { main } from './symlink-changelogs.js';

describe('symlink-changelogs', () => {
    it('runs without throwing against the real workspace', () => {
        const result = main({ quiet: true });
        expect(result.linked).toBeGreaterThanOrEqual(0);
    });
});

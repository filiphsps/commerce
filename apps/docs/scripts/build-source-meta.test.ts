import { describe, expect, it } from 'vitest';
import { main } from './build-source-meta';

describe('build-source-meta', () => {
    it('emits at least one redirect per static path plus catch-alls', () => {
        const result = main({ quiet: true });
        expect(result.redirects).toBeGreaterThanOrEqual(6);
    });
});

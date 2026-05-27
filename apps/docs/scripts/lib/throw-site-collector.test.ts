import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { collectThrowSites } from './throw-site-collector';

describe('collectThrowSites', () => {
    it('finds at least one throw in the monorepo', () => {
        const sites = collectThrowSites(path.resolve(__dirname, '../../../..'));
        expect(sites.length).toBeGreaterThan(0);
    });
});

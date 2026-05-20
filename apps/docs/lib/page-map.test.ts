import { describe, expect, it } from 'vitest';
import { findWorkspace, getWorkspacesByType } from './page-map';

describe('page-map helpers', () => {
    it('separates apps from packages', () => {
        // Should not throw even when page-map.generated.ts hasn't been written
        // (we mock it via a vi.mock in real-world; here just smoke).
        const result = getWorkspacesByType();
        expect(result).toHaveProperty('apps');
        expect(result).toHaveProperty('packages');
    });

    it('findWorkspace returns undefined for unknown slug', () => {
        expect(findWorkspace('nonexistent-xyz')).toBeUndefined();
    });
});

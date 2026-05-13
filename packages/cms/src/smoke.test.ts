import { describe, expect, it } from 'vitest';
import { cmsPackageVersion } from './index';

describe('@nordcom/commerce-cms package', () => {
    it('exports a version string', () => {
        expect(cmsPackageVersion).toMatch(/^\d+\.\d+\.\d+/);
    });
});

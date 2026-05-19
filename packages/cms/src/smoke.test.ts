import { describe, expect, it } from 'vitest';
import pkg from '../package.json' with { type: 'json' };
import { cmsPackageVersion } from './index';

describe('@nordcom/commerce-cms package', () => {
    it('exports a version string', () => {
        expect(cmsPackageVersion).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('mirrors the version field of package.json', () => {
        expect(cmsPackageVersion).toBe(pkg.version);
    });
});

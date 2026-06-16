import { describe, expect, it } from 'vitest';

import { resolveBuildId } from './resolve-build-id';

describe('resolveBuildId', () => {
    it('prefers NEXT_DEPLOYMENT_ID above all', () =>
        expect(resolveBuildId({ NEXT_DEPLOYMENT_ID: 'nd', VERCEL_DEPLOYMENT_ID: 'dpl', GIT_COMMIT_SHA: 'sha' })).toBe(
            'nd',
        ));

    it('prefers VERCEL_DEPLOYMENT_ID above all', () => {
        expect(
            resolveBuildId({
                VERCEL_DEPLOYMENT_ID: 'dpl_1',
                GIT_COMMIT_SHA: 'sha',
                NEXT_PUBLIC_BUILD_ID: 'nb',
            }),
        ).toBe('dpl_1');
    });

    it('falls back to GIT_COMMIT_SHA', () => {
        expect(resolveBuildId({ GIT_COMMIT_SHA: 'sha1' })).toBe('sha1');
    });

    it('falls back to VERCEL_GIT_COMMIT_SHA', () => {
        expect(resolveBuildId({ VERCEL_GIT_COMMIT_SHA: 'sha2' })).toBe('sha2');
    });

    it('falls back to NEXT_PUBLIC_BUILD_ID', () => {
        expect(resolveBuildId({ NEXT_PUBLIC_BUILD_ID: 'nb' })).toBe('nb');
    });

    it('falls back to BUILD_ID', () => {
        expect(resolveBuildId({ BUILD_ID: 'b' })).toBe('b');
    });

    it('falls through an empty GIT_COMMIT_SHA to VERCEL_GIT_COMMIT_SHA', () => {
        expect(resolveBuildId({ GIT_COMMIT_SHA: '', VERCEL_GIT_COMMIT_SHA: 'sha2' })).toBe('sha2');
    });

    it("returns 'development' when nothing is set", () => {
        expect(resolveBuildId({})).toBe('development');
    });

    it('ignores empty-string values', () => {
        expect(resolveBuildId({ VERCEL_DEPLOYMENT_ID: '', GIT_COMMIT_SHA: 'sha' })).toBe('sha');
    });
});

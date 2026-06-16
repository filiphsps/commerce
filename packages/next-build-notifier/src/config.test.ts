import { afterEach, describe, expect, it, vi } from 'vitest';

import { withBuildNotifier } from './config';

describe('withBuildNotifier', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('bakes NEXT_PUBLIC_BUILD_ID and sets deploymentId from the resolved id', () => {
        const out = withBuildNotifier({ reactStrictMode: true }, { env: { GIT_COMMIT_SHA: 'sha9' } });

        expect(out.reactStrictMode).toBe(true);
        expect(out.env?.NEXT_PUBLIC_BUILD_ID).toBe('sha9');
        expect(out.deploymentId).toBe('sha9');
    });

    it('preserves an existing env and generateBuildId', async () => {
        const generateBuildId = async () => 'dev';
        const out = withBuildNotifier(
            { env: { ENVIRONMENT: 'production' }, generateBuildId },
            { env: { GIT_COMMIT_SHA: 'sha9' } },
        );

        expect(out.env).toMatchObject({ ENVIRONMENT: 'production', NEXT_PUBLIC_BUILD_ID: 'sha9' });
        expect(await out.generateBuildId?.()).toBe('dev');
    });

    it('respects an explicit buildId and can skip deploymentId', () => {
        const out = withBuildNotifier({}, { buildId: 'explicit', setDeploymentId: false });
        expect(out.env?.NEXT_PUBLIC_BUILD_ID).toBe('explicit');
        expect(out.deploymentId).toBeUndefined();
    });

    it('keeps a pre-existing deploymentId', () => {
        const out = withBuildNotifier({ deploymentId: 'mine' }, { env: { GIT_COMMIT_SHA: 'sha9' } });
        expect(out.deploymentId).toBe('mine');
    });

    it('falls back to process.env when no env option is given', () => {
        vi.stubEnv('GIT_COMMIT_SHA', 'envsha');
        expect(withBuildNotifier({}).env?.NEXT_PUBLIC_BUILD_ID).toBe('envsha');
    });

    it('bakes an id with empty options', () => {
        vi.stubEnv('GIT_COMMIT_SHA', 'envsha');
        expect(withBuildNotifier({}, {}).env?.NEXT_PUBLIC_BUILD_ID).toBeTruthy();
    });
});

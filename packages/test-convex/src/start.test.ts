import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { resolveConvexProjectDir, resolveConvexStateDir, type StartedConvex, startConvex } from './start';

afterEach(() => {
    delete process.env.CONVEX_PROJECT_DIR;
});

describe('Convex project/state resolution', () => {
    it('honors CONVEX_PROJECT_DIR for the project directory', () => {
        const dir = mkdtempSync(resolve(tmpdir(), 'test-convex-resolve-'));
        try {
            process.env.CONVEX_PROJECT_DIR = dir;
            expect(resolveConvexProjectDir()).toBe(resolve(dir));
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });

    it('defaults the project directory to the sibling @nordcom/commerce-convex package', () => {
        expect(resolveConvexProjectDir().replace(/\\/g, '/')).toMatch(/packages\/convex$/);
    });

    it('places the state directory at <projectDir>/.convex', () => {
        const dir = mkdtempSync(resolve(tmpdir(), 'test-convex-resolve-'));
        try {
            expect(resolveConvexStateDir(dir)).toBe(resolve(dir, '.convex'));
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});

/**
 * Integration smoke test for the real backend lifecycle. Booting a local Convex
 * backend downloads/launches the `convex-local-backend` binary and mints an
 * anonymous admin key over the network, which is too slow/flaky for the default
 * unit run. Enable it explicitly with `TEST_CONVEX_INTEGRATION=1` (CI runs it
 * against the cached binary):
 *
 *   TEST_CONVEX_INTEGRATION=1 vitest run src/start.test.ts
 */
const integration = process.env.TEST_CONVEX_INTEGRATION === '1' ? it : it.skip;

describe('startConvex (integration)', () => {
    integration(
        'boots an ephemeral backend, exposes a reachable URL + admin key, then stops cleanly',
        async () => {
            let handle: StartedConvex | undefined;
            try {
                handle = await startConvex();
                expect(handle.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
                expect(handle.adminKey.length).toBeGreaterThan(0);

                const resp = await fetch(`${handle.url}/instance_name`);
                expect(resp.status).toBe(200);
            } finally {
                await handle?.stop();
            }
        },
        120_000,
    );
});

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Repo root resolved from this test file's location: src → test-convex → packages → root. Anchored to
 * the file (not `process.cwd()`, which differs between a package-scoped run and the turbo root run).
 */
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const GUARD_SCRIPT = join(REPO_ROOT, '.github/scripts/require-convex-deploy-key.sh');
const DEPLOY_WORKFLOW = join(REPO_ROOT, '.github/workflows/deploy.yml');
const RELEASE_WORKFLOW = join(REPO_ROOT, '.github/workflows/release.yml');

/**
 * Runs the production deploy-key guard with a controlled `CONVEX_DEPLOY_KEY` and returns its result.
 * The ambient env carries `CONVEX_DEPLOY_KEY` (loaded by dotenv during tests), so the missing-key case
 * must delete it rather than trust the inherited environment.
 *
 * @param key - Value to set for `CONVEX_DEPLOY_KEY`, or `null` to run with the variable unset.
 * @returns The guard's exit status and captured stdout/stderr text.
 */
function runGuard(key: string | null): { status: number | null; stdout: string; stderr: string } {
    const env = { ...process.env };
    if (key === null) {
        delete env.CONVEX_DEPLOY_KEY;
    } else {
        env.CONVEX_DEPLOY_KEY = key;
    }
    const result = spawnSync('bash', [GUARD_SCRIPT], { env, encoding: 'utf8' });
    return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe('require-convex-deploy-key.sh', () => {
    it('fails loudly when CONVEX_DEPLOY_KEY is unset', () => {
        const { status, stderr } = runGuard(null);
        expect(status).toBe(1);
        expect(stderr).toContain('::error');
        expect(stderr).toContain('CONVEX_DEPLOY_KEY is not configured');
    });

    it('fails loudly when CONVEX_DEPLOY_KEY is empty', () => {
        const { status, stderr } = runGuard('');
        expect(status).toBe(1);
        expect(stderr).toContain('::error');
    });

    it('passes when CONVEX_DEPLOY_KEY is configured', () => {
        const { status, stdout } = runGuard('dev:colorful-aardvark-6|secret');
        expect(status).toBe(0);
        expect(stdout).toContain('may proceed');
    });
});

describe('production Convex deploy jobs never silently skip', () => {
    const workflows: ReadonlyArray<readonly [string, string]> = [
        ['deploy.yml', readFileSync(DEPLOY_WORKFLOW, 'utf8')],
        ['release.yml', readFileSync(RELEASE_WORKFLOW, 'utf8')],
    ];

    for (const [name, yaml] of workflows) {
        it(`${name} gates the Convex deploy on the fail-loud key guard`, () => {
            expect(yaml).toContain('.github/scripts/require-convex-deploy-key.sh');
        });

        it(`${name} drops the green-skip path that hid the production drift`, () => {
            // The regression this guards: a green-but-skipped deploy let the backend fall behind the
            // apps that call it. Any of these re-introduces the silent skip.
            expect(yaml).not.toContain('configured=false');
            expect(yaml).not.toContain('steps.deploy-key');
            expect(yaml).not.toContain('Convex production deploy SKIPPED');
        });

        it(`${name} still runs the real production deploy`, () => {
            expect(yaml).toContain('run: pnpm convex:deploy');
        });
    }
});

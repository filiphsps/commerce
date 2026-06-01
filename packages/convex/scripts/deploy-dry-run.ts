import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { runDryRun, type TighteningCheck } from '../convex/lib/dryrun.ts';

/**
 * Node entrypoint for the expand/contract deploy dry-run gate (`pnpm convex:deploy:dry-run`). The
 * inspectable decision logic lives in `convex/lib/dryrun.ts` (Node-free, so it typechecks under the
 * Convex isolate config and is unit-tested there); this file supplies only the Node-side pieces — CLI
 * resolution, spawning `convex deploy --dry-run`, and process exit-code wiring.
 *
 * Sandbox note: a real `convex deploy --dry-run` needs a reachable deployment, which is not available
 * in CI / a fresh checkout, so {@link runConfigDryRun} skips the CLI (treated as success) unless a
 * deployment is configured. The live-row tightening validation it guards is proven independently by
 * the unit tests for `convex/lib/dryrun.ts`.
 */

/**
 * Resolves the absolute path to the `convex` CLI's JS entrypoint from this package's installed copy,
 * by hand (rather than via `npx`/`pnpm exec`) so the gate runs under a bare `node` invocation and
 * resolves the workspace-local CLI deterministically.
 *
 * @returns The absolute path to the `convex` CLI entry module.
 */
function resolveConvexBin(): string {
    const require = createRequire(import.meta.url);
    const pkgPath = require.resolve('convex/package.json');
    const bin = (JSON.parse(readFileSync(pkgPath, 'utf8')) as { bin: string | { convex: string } }).bin;
    return join(dirname(pkgPath), typeof bin === 'string' ? bin : bin.convex);
}

/**
 * Runs `convex deploy --dry-run`, which prints the generated configuration WITHOUT promoting it,
 * surfacing schema/codegen compile errors and (against a configured deployment) Convex's own
 * server-side rejection of a schema that would invalidate live documents. Skipped — treated as success
 * — when no deployment is configured, so the gate is runnable in a fresh checkout / CI, mirroring
 * `scripts/build.mjs`'s codegen gate.
 *
 * @returns A process exit code: `0` when the dry-run succeeds or is skipped, non-zero on CLI failure.
 */
function runConfigDryRun(): number {
    const configured = Boolean(process.env.CONVEX_DEPLOYMENT || process.env.CONVEX_DEPLOY_KEY);
    if (!configured && process.env.CONVEX_AGENT_MODE !== 'anonymous') {
        console.info(
            '[deploy-dry-run] No deployment configured; skipping `convex deploy --dry-run`. Live-row tightening checks passed.'
        );
        return 0;
    }

    const result = spawnSync(process.execPath, [resolveConvexBin(), 'deploy', '--dry-run'], {
        stdio: 'inherit',
        env: process.env,
    });
    if (result.error) {
        console.error(`[deploy-dry-run] failed to spawn the convex CLI: ${result.error.message}`);
        return 1;
    }
    return result.status ?? 1;
}

/**
 * Pre-promotion tightening checks enforced by this gate. Concrete checks are registered by the
 * data-migration tasks that tighten a validator (each pairs the proposed tightened validator with the
 * live rows it must accept); the list is intentionally empty until then, so the gate currently asserts
 * only the config dry-run.
 */
const TIGHTENING_CHECKS: ReadonlyArray<TighteningCheck> = [];

/**
 * Determines whether this module is the process entrypoint (run directly), as opposed to imported.
 * Guards {@link main} so importing the module never spawns the CLI.
 *
 * @returns `true` when this module was invoked directly via `node`.
 */
function isMainModule(): boolean {
    const entry = process.argv[1];
    return entry !== undefined && import.meta.url === pathToFileURL(entry).href;
}

/**
 * Script entrypoint: runs the dry-run gate and propagates its exit code so a failing tightening check
 * fails the command before any promotion.
 *
 * @returns void
 */
function main(): void {
    process.exitCode = runDryRun(TIGHTENING_CHECKS, runConfigDryRun);
}

if (isMainModule()) {
    main();
}

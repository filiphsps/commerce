import { execSync } from 'node:child_process';

/**
 * Build entrypoint for `@nordcom/commerce-convex`.
 *
 * Convex codegen needs a configured deployment (or an auto-started local
 * backend) to emit `convex/_generated`. Those files are committed to the repo
 * per Convex's monorepo guidance, so a fresh `pnpm install` and CI build must
 * succeed WITHOUT a deployment. We therefore only invoke `convex codegen` when
 * a deployment is configured; otherwise the committed generated files stand in
 * and we exit cleanly. The standalone `pnpm codegen` script always regenerates
 * (used by later table-adding work that does have a deployment).
 *
 * @returns {void}
 * @throws {Error} When a deployment is configured and `convex codegen` exits
 *   non-zero (the `execSync` failure propagates to fail the build).
 */
function main() {
    const hasDeployment = Boolean(process.env.CONVEX_DEPLOYMENT || process.env.CONVEX_DEPLOY_KEY);
    if (!hasDeployment) {
        console.info(
            '[commerce-convex] No CONVEX_DEPLOYMENT/CONVEX_DEPLOY_KEY set; skipping codegen and using committed convex/_generated.',
        );
        return;
    }

    execSync('convex codegen', { stdio: 'inherit' });
}

main();

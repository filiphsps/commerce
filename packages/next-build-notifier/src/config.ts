import type { NextConfig } from 'next';

import { type BuildIdEnv, resolveBuildId } from './shared/resolve-build-id';

export { type BuildIdEnv, resolveBuildId } from './shared/resolve-build-id';

/**
 * Options for {@link withBuildNotifier}.
 */
export type WithBuildNotifierOptions = {
    /** Explicit build id. Defaults to `resolveBuildId(options.env)`. */
    buildId?: string;
    /** Environment bag used to resolve the build id. Defaults to `process.env`. */
    env?: BuildIdEnv;
    /**
     * Also set Next's native `deploymentId` (version-skew hard navigation) to the resolved id, unless
     * the config already has one. Defaults to `true`.
     */
    setDeploymentId?: boolean;
};

/**
 * Wraps a Next.js config so the running client knows its own build id: bakes `NEXT_PUBLIC_BUILD_ID`
 * (merged into `env`) and, by default, sets `deploymentId` to the same value so Next's native skew
 * handling and this notifier agree on one source of truth. Composes with an existing `env` and
 * `generateBuildId`.
 *
 * @remarks Because `resolveBuildId` reads `NEXT_DEPLOYMENT_ID` first, the baked `NEXT_PUBLIC_BUILD_ID`
 * automatically matches Next's native `deploymentId` whenever that env var is set. If you set
 * `deploymentId` only via the env var (not in config), the config-level `deploymentId` this wrapper
 * adds is harmless and the two ids stay aligned.
 * @param nextConfig - The Next.js config to wrap.
 * @param options - See {@link WithBuildNotifierOptions}.
 * @returns The wrapped Next.js config.
 * @example
 * ```js
 * // next.config.js
 * import { withBuildNotifier } from 'next-build-notifier/config';
 * /** @type {import('next').NextConfig} *\/
 * const config = { reactStrictMode: true };
 * export default withBuildNotifier(config);
 * ```
 */
export function withBuildNotifier(nextConfig: NextConfig = {}, options: WithBuildNotifierOptions = {}): NextConfig {
    const env = options.env ?? (process.env as BuildIdEnv);
    const buildId = options.buildId ?? resolveBuildId(env);
    const setDeploymentId = options.setDeploymentId !== false;

    return {
        ...nextConfig,
        env: { ...nextConfig.env, NEXT_PUBLIC_BUILD_ID: buildId },
        ...(setDeploymentId && !nextConfig.deploymentId ? { deploymentId: buildId } : {}),
    };
}

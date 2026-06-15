/**
 * The subset of environment variables {@link resolveBuildId} reads, in priority order.
 */
export type BuildIdEnv = Partial<
    Record<
        'VERCEL_DEPLOYMENT_ID' | 'GIT_COMMIT_SHA' | 'VERCEL_GIT_COMMIT_SHA' | 'NEXT_PUBLIC_BUILD_ID' | 'BUILD_ID',
        string
    >
>;

/**
 * Resolves a single canonical build identifier from the environment so the client (baked at build
 * time) and the version endpoint (read at runtime) always derive their id from the same source.
 * Vercel's deployment id wins when present; otherwise the git commit sha, then an explicit build id.
 *
 * @param env - The environment bag. Defaults to `process.env`. Inject a plain object in tests.
 * @returns The resolved build id. Priority: VERCEL_DEPLOYMENT_ID → GIT_COMMIT_SHA → VERCEL_GIT_COMMIT_SHA → NEXT_PUBLIC_BUILD_ID → BUILD_ID → 'development'.
 */
export function resolveBuildId(env: BuildIdEnv = process.env as BuildIdEnv): string {
    return (
        env.VERCEL_DEPLOYMENT_ID ||
        env.GIT_COMMIT_SHA ||
        env.VERCEL_GIT_COMMIT_SHA ||
        env.NEXT_PUBLIC_BUILD_ID ||
        env.BUILD_ID ||
        'development'
    );
}

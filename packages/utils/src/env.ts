import { execSync } from 'node:child_process';

/**
 * Environment metadata captured once at build time.
 *
 * @example
 * ```ts
 * const { isDev, environment, gitSHA } = resolveBuildEnv();
 * ```
 */
export type BuildEnv = {
    isDev: boolean;
    environment: 'development' | 'preview' | 'production';
    gitSHA: string;
};

type InputEnv = Partial<{
    NODE_ENV: string;
    VERCEL_ENV: string;
    GIT_COMMIT_SHA: string;
    VERCEL_GIT_COMMIT_SHA: string;
}>;

/**
 * Derives environment metadata from process variables, falling back to `git rev-parse HEAD` for the commit SHA when no variable is present.
 *
 * @param input - Environment variable bag. Defaults to `process.env`. Inject a plain object in tests to avoid `execSync` side-effects.
 * @returns A {@link BuildEnv} snapshot with deployment tier, dev flag, and commit SHA.
 * @example
 * ```ts
 * const env = resolveBuildEnv();
 * console.log(env.environment); // 'development' | 'preview' | 'production'
 * ```
 */
export function resolveBuildEnv(input: InputEnv = process.env as InputEnv): BuildEnv {
    const isDev = [input.NODE_ENV, input.VERCEL_ENV].includes('development');
    const environment: BuildEnv['environment'] =
        input.VERCEL_ENV === 'preview' ? 'preview' : isDev ? 'development' : 'production';

    let gitSHA = input.GIT_COMMIT_SHA ?? input.VERCEL_GIT_COMMIT_SHA;
    if (!gitSHA) {
        try {
            gitSHA = execSync('git rev-parse HEAD').toString().trim();
        } catch {
            gitSHA = 'unknown';
        }
    }
    return { isDev, environment, gitSHA: gitSHA || 'unknown' };
}

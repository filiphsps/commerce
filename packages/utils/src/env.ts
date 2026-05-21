import { execSync } from 'node:child_process';

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

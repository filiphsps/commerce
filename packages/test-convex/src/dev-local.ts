/** Fixed shape of the local-first dev backend. Pinned so env defaults and scripts stay deterministic. */
export const DEV_LOCAL = {
    /** Port the local backend listens on (matches CONVEX_URL in the env examples). */
    port: 3210,
    /** Deployment URL the apps and seed target. */
    url: 'http://127.0.0.1:3210',
    /** Persistent state directory (gitignored). */
    dataDir: '.convex-local',
    /** Server-tier secret set on the backend AND used by the apps + seed. */
    serverSecret: 'dev-local-secret',
    /** Auth placeholders the deployed functions' auth.config.ts validates against. */
    auth: {
        issuer: 'https://dev.localhost.invalid',
        applicationId: 'convex',
        jwksUrl: 'https://dev.localhost.invalid/.well-known/jwks.json',
    },
} as const;

/**
 * Builds the child-process environment for one bundled-Convex-CLI invocation against the local
 * backend, authenticating with the daemon's admin key. Blanks the cloud-deployment selectors (and
 * `CONVEX_DEPLOYMENT`, which `packages/convex/.env.local` would otherwise dotenv-shadow onto the wrong
 * deployment), mirroring `seed/live.ts`'s `buildSeedCliEnv` self-hosted branch.
 *
 * @param url - Local deployment URL.
 * @param adminKey - The daemon's admin key (from the `.admin-key` marker).
 * @param env - Source environment (injectable for unit tests).
 * @returns The child-process environment.
 */
export function convexLocalCliEnv(
    url: string,
    adminKey: string,
    env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
    return {
        ...env,
        CONVEX_SELF_HOSTED_URL: url,
        CONVEX_SELF_HOSTED_ADMIN_KEY: adminKey,
        CONVEX_DEPLOYMENT: '',
        CONVEX_DEPLOY_KEY: '',
    };
}

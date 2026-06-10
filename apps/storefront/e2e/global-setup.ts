import { MissingEnvironmentVariableError, UnknownShopDomainError } from '@nordcom/commerce-errors';
import { seedCanonical } from '@nordcom/commerce-test-convex';
import { ConvexHttpClient } from 'convex/browser';
import { type FunctionReference, makeFunctionReference } from 'convex/server';

/** Hostname → shop server query — the SAME `db/shops` seam the storefront middleware routes through. */
export const shopByDomainRef = makeFunctionReference<'query'>('db/shops:byDomain');

/** The narrow `byDomain` result surface the setup consumes (the wire erases the branded ids). */
type ShopByDomainView = { shop: { _id: string } } | null;

/** The slice of `ConvexHttpClient` the setup needs — kept minimal so unit tests can hand in a fake. */
export interface SetupConvexClient {
    query(reference: FunctionReference<'query'>, args: Record<string, unknown>): Promise<unknown>;
}

/**
 * The injectable Convex surface behind {@link runGlobalSetup}: the canonical seed plus a client
 * factory, so the unit suite can mock the Convex client and prove the seed → resolve → emit
 * sequence without a deployment.
 */
export interface GlobalSetupConvex {
    /** Seeds the canonical tenant onto the deployment; resolves to the canonical `shops` doc id. */
    seed(url: string): Promise<string>;
    /** Builds a (server-tier) client for the deployment. */
    createClient(url: string): SetupConvexClient;
}

/** Production wiring: the real test-convex live seed and a real `ConvexHttpClient`. */
const defaultConvex: GlobalSetupConvex = {
    seed: (url) => seedCanonical(url),
    createClient: (url) => new ConvexHttpClient(url),
};

/**
 * The testable core of the Playwright globalSetup: ensures the canonical demo tenant exists on the
 * CONFIGURED Convex deployment (`CONVEX_URL` — the same deployment `pnpm dev` points the app at, so
 * the webServer's middleware resolves the very rows this seeds), resolves the tenant through the
 * `db/shops:byDomain` server seam, and emits the shop's Convex document id as `E2E_TENANT_ID` for
 * the spec workers (header/footer/info-bar/mega-menu pass it back into the per-spec CMS fixture).
 *
 * The app runtime's Mongo side is NOT touched here: until CUTOVER the dual-read CMS getters serve
 * Payload-on-Mongo, which the `pnpm dev` daemon machinery (`predev-mongo.ts`) boots and seeds with
 * the SAME canonical content — the SFREAD-01 goldens pin the two corpora byte-identical, which is
 * what keeps the two seeds coherent.
 *
 * @param env - The environment to read configuration from and emit `E2E_TENANT_ID` into.
 * @param convex - The Convex surface (injectable for unit tests).
 * @returns The emitted tenant id (the canonical `shops` document id).
 * @throws {MissingEnvironmentVariableError} When `CONVEX_URL`/`NEXT_PUBLIC_CONVEX_URL` or
 *   `CONVEX_SERVER_SECRET` is unset — run via `pnpm test:e2e` so root `.env.local` loads.
 * @throws {UnknownShopDomainError} When the demo shop cannot be resolved after seeding.
 */
export async function runGlobalSetup(
    env: NodeJS.ProcessEnv = process.env,
    convex: GlobalSetupConvex = defaultConvex,
): Promise<string> {
    const url = env.CONVEX_URL || env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) {
        throw new MissingEnvironmentVariableError('CONVEX_URL', 'Run via `pnpm test:e2e` so root .env.local loads.');
    }
    const serverSecret = env.CONVEX_SERVER_SECRET;
    if (!serverSecret) {
        throw new MissingEnvironmentVariableError(
            'CONVEX_SERVER_SECRET',
            'It must match the value set on the Convex deployment under test.',
        );
    }

    await convex.seed(url);

    const domain = env.E2E_SHOP_DOMAIN ?? 'nordcom-demo-shop.com';
    const view = (await convex.createClient(url).query(shopByDomainRef, { serverSecret, domain })) as ShopByDomainView;
    if (!view) {
        throw new UnknownShopDomainError(domain, 'The demo shop is missing after the canonical Convex seed.');
    }

    env.E2E_TENANT_ID = view.shop._id;
    console.info(`[global-setup] CONVEX_URL=${url} E2E_TENANT_ID=${view.shop._id}`);
    return view.shop._id;
}

/**
 * Playwright globalSetup entry point: {@link runGlobalSetup} against the real process environment.
 *
 * @returns Resolves once the seed completes and `E2E_TENANT_ID` is exported.
 */
export default async function globalSetup(): Promise<void> {
    await runGlobalSetup();
}

/**
 * Playwright globalTeardown: no-op. The Convex deployment under test is owned by its launcher (the
 * configured dev deployment or a test-convex daemon), never by this file.
 *
 * @returns Immediately.
 */
export async function globalTeardown(): Promise<void> {}

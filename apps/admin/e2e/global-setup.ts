import { MissingEnvironmentVariableError } from '@nordcom/commerce-errors';
import { DEFAULT_SHOP_LEGACY_ID, seedCanonical, type SeedClerkOperatorView } from '@nordcom/commerce-test-convex';
import { clerk, clerkSetup } from '@clerk/testing/playwright';
import { type Browser, chromium, expect } from '@playwright/test';

import { STORAGE_STATE_PATH } from './fixtures/storage-state';
import { type ClerkBackendOrg, type ClerkBackendUser, ensureClerkOrg, ensureClerkUser } from './support/clerk-backend';
import { E2E_OPERATOR_EMAIL } from './support/clerk';

/** Stable slug for the primary e2e operator's org (the idempotency key for the find-or-create in Clerk). */
const E2E_ORG_SLUG = 'nordcom-e2e';
/** Display name for the primary e2e operator's org, mirrored into the Convex `orgs` table. */
const E2E_ORG_NAME = 'Nordcom E2E';
/** Display name for the seeded operator's `users` row. */
const E2E_OPERATOR_NAME = 'E2E Test User';

/**
 * The Clerk + Convex tier the harness provisions: the Clerk backend identities and the seed wiring,
 * injectable so the unit suite proves the orchestration without a Clerk dev instance or a Convex
 * deployment.
 */
export interface ClerkSetupDeps {
    /** Find-or-create the Clerk test user for `email`. */
    ensureUser(email: string): Promise<ClerkBackendUser>;
    /** Find-or-create the Clerk org (`slug`/`name`) owned by `createdByUserId`. */
    ensureOrg(slug: string, name: string, createdByUserId: string): Promise<ClerkBackendOrg>;
    /** Seed the canonical tenant onto the deployment; resolves to the canonical shop id string. */
    seedShop(url: string): Promise<string>;
    /** Seed the operator's Clerk identity model (user/org/membership/collaborator) onto the deployment. */
    seedOperator(url: string, args: ClerkSeedArgs): Promise<SeedClerkOperatorView>;
}

/** The argument bundle {@link ClerkSetupDeps.seedOperator} forwards to the deployed seed mutation. */
export interface ClerkSeedArgs {
    clerkUserId: string;
    email: string;
    name: string;
    clerkOrgId: string;
    orgName: string;
    orgSlug: string;
    shopLegacyId: string;
}

/** Production wiring: the real Clerk Backend REST helpers + the live test-convex seed runners. */
const defaultDeps: ClerkSetupDeps = {
    ensureUser: (email) => ensureClerkUser(email),
    ensureOrg: (slug, name, createdByUserId) => ensureClerkOrg(slug, name, createdByUserId),
    seedShop: (url) => seedCanonical(url),
    seedOperator: async (url, args) => {
        const { seedClerkOperatorLive } = await import('@nordcom/commerce-test-convex');
        return seedClerkOperatorLive(url, { ...args, orgSlug: args.orgSlug, role: 'org:admin' });
    },
};

/**
 * The testable orchestration core of the Playwright globalSetup's data phase: provisions the e2e Clerk
 * operator + org in the Clerk dev instance (find-or-create), seeds the canonical tenant onto the
 * configured Convex deployment, then seeds the operator's identity model so the org owns the canonical
 * shop and the `shopCollaborators` projection mirrors what the Clerk webhook would have synced.
 *
 * Idempotent end-to-end: the Clerk find-or-create probes before creating, the canonical seed heals a
 * partial corpus, and the operator seed upserts every row — so a re-run against the shared dev instance
 * and deployment is safe.
 *
 * @param env - The environment to read configuration from.
 * @param deps - The Clerk + Convex transport surface (injectable for unit tests).
 * @returns The provisioned Clerk user, the Clerk org, and the Convex seed view.
 * @throws {MissingEnvironmentVariableError} When `CONVEX_URL`/`NEXT_PUBLIC_CONVEX_URL` is unset — run
 *   via `pnpm test:e2e` so root `.env.local` loads.
 */
export async function seedE2eClerkOperator(
    env: NodeJS.ProcessEnv = process.env,
    deps: ClerkSetupDeps = defaultDeps,
): Promise<{ user: ClerkBackendUser; org: ClerkBackendOrg; seed: SeedClerkOperatorView }> {
    const url = env.CONVEX_URL || env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) {
        throw new MissingEnvironmentVariableError('CONVEX_URL', 'Run via `pnpm test:e2e` so root .env.local loads.');
    }

    const user = await deps.ensureUser(E2E_OPERATOR_EMAIL);
    const org = await deps.ensureOrg(E2E_ORG_SLUG, E2E_ORG_NAME, user.id);

    await deps.seedShop(url);
    const seed = await deps.seedOperator(url, {
        clerkUserId: user.id,
        email: user.primaryEmail,
        name: E2E_OPERATOR_NAME,
        clerkOrgId: org.id,
        orgName: org.name,
        orgSlug: org.slug,
        shopLegacyId: DEFAULT_SHOP_LEGACY_ID,
    });

    return { user, org, seed };
}

/**
 * Drives a real Chromium page to sign the seeded operator into Clerk and persists the authenticated
 * storage state to {@link STORAGE_STATE_PATH} (the path `playwright.config.ts` hands every project).
 * Uses `@clerk/testing`'s `clerk.signIn({ emailAddress })`, which mints a SERVER-SIDE session and
 * bypasses all verification (no OTP UI). Sign-in must run on a page that has loaded Clerk JS, so it
 * navigates to the sign-in route first; then it asserts the authenticated chooser renders before
 * saving state, so a broken token never produces a green-but-unauthenticated storage file.
 *
 * @param browser - The Playwright browser to open the auth page in.
 * @param email - The operator email to sign in (the seeded `+clerk_test` identity).
 * @returns Resolves once the authenticated storage state is written.
 */
async function signInAndSaveState(browser: Browser, email: string): Promise<void> {
    const context = await browser.newContext({ baseURL: 'http://localhost:3000', ignoreHTTPSErrors: true });
    const page = await context.newPage();
    try {
        // Load a page where Clerk JS is present. The unauthenticated root redirects to the sign-in
        // route, which mounts <SignIn/> (Clerk loaded) — the surface `clerk.signIn` needs.
        await page.goto('/auth/sign-in/');
        await clerk.signIn({ page, emailAddress: email });

        // Confirm the session is live: the authenticated chooser renders its heading.
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Choose a storefront' })).toBeVisible({ timeout: 30_000 });

        await context.storageState({ path: STORAGE_STATE_PATH });
    } finally {
        await context.close();
    }
}

/**
 * Playwright globalSetup for the admin e2e suite, authenticated through Clerk.
 *
 * Phases: (1) `clerkSetup()` fetches a Testing Token from `CLERK_SECRET_KEY` for the whole run;
 * (2) {@link seedE2eClerkOperator} provisions the Clerk operator/org and seeds the matching Convex
 * tenant graph; (3) {@link signInAndSaveState} signs the operator in and writes the shared storage
 * state every spec inherits via `use.storageState`.
 *
 * @returns Resolves once the operator is provisioned, seeded, signed in, and the storage state saved.
 * @throws {MissingEnvironmentVariableError} When the Convex deployment URL is unset.
 */
export default async function globalSetup(): Promise<void> {
    // `clerkSetup` reads `CLERK_PUBLISHABLE_KEY` by default, but the repo's env carries the key under the
    // Next-public name (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`); pass it (and the Frontend API URL)
    // explicitly so the testing-token fetch works regardless of which name the loaded env used.
    // `secretKey` is still read from `CLERK_SECRET_KEY` automatically.
    await clerkSetup({
        publishableKey: process.env.CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        frontendApiUrl: process.env.CLERK_FRONTEND_API_URL,
    });
    await seedE2eClerkOperator();

    const browser = await chromium.launch();
    try {
        await signInAndSaveState(browser, E2E_OPERATOR_EMAIL);
    } finally {
        await browser.close();
    }
}

/**
 * Playwright globalTeardown: no-op. The Convex deployment under test is owned by its launcher, never by
 * this file; the Clerk dev instance's test identities are reused across runs (find-or-create), not torn
 * down here.
 *
 * @returns Immediately.
 */
export async function globalTeardown(): Promise<void> {}

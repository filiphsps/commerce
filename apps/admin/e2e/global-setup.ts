import {
    MissingEnvironmentVariableError,
    NotFoundError,
    TodoError,
    UnknownShopDomainError,
} from '@nordcom/commerce-errors';
import { seedCanonical } from '@nordcom/commerce-test-convex';
import { ConvexHttpClient } from 'convex/browser';
import { type FunctionReference, makeFunctionReference } from 'convex/server';

const TEST_EMAIL = 'e2e-test@example.com';

/** Hostname → shop server query — the SAME `db/shops` seam the admin shell resolves tenants through. */
export const shopByDomainRef = makeFunctionReference<'query'>('db/shops:byDomain');
/** Email → platform-user server query; the idempotency probe for the operator upsert. */
export const userByEmailRef = makeFunctionReference<'query'>('db/users:byEmail');
/** Platform-user insert backing the first-run operator seed (`users.by_email` unique-enforced). */
export const userCreateRef = makeFunctionReference<'mutation'>('db/users:create');
/** The single atomic shop write; its `collaborators` list delete-diff-syncs the `shopCollaborators` join. */
export const upsertShopRef = makeFunctionReference<'mutation'>('db/shop_write:upsertShop');

/** The narrow `byDomain` result surface the setup consumes (the wire erases the branded ids). */
type ShopByDomainView = { shop: { _id: string; legacyId: string } } | null;

/** The narrow `users` row surface the setup consumes from `byEmail`/`create`. */
type UserView = { _id: string };

/** The narrow `upsertShop` result surface — `null` means the keyed shop row vanished mid-setup. */
type ShopWriteView = { shop: { _id: string } } | null;

/** The slice of `ConvexHttpClient` the setup needs — kept minimal so unit tests can hand in a fake. */
export interface SetupConvexClient {
    query(reference: FunctionReference<'query'>, args: Record<string, unknown>): Promise<unknown>;
    mutation(reference: FunctionReference<'mutation'>, args: Record<string, unknown>): Promise<unknown>;
}

/**
 * The injectable substrate behind {@link seedE2eOperator}: the canonical Convex seed and a
 * server-tier client factory — so the unit suite can mock every transport and prove the seed
 * sequence without a deployment.
 */
export interface GlobalSetupDeps {
    convex: {
        /** Seeds the canonical tenant onto the deployment; resolves to the canonical `shops` doc id. */
        seed(url: string): Promise<string>;
        /** Builds a (server-tier) client for the deployment. */
        createClient(url: string): SetupConvexClient;
    };
}

/** Production wiring: the real test-convex live seed plus a real `ConvexHttpClient`. */
const defaultDeps: GlobalSetupDeps = {
    convex: {
        seed: (url) => seedCanonical(url),
        createClient: (url) => new ConvexHttpClient(url),
    },
};

/**
 * The testable seed core of the Playwright globalSetup: ensures the canonical demo tenant exists on
 * the configured Convex deployment, resolves it through the `db/shops:byDomain` server seam, upserts
 * the e2e operator against the unified model (`users` keyed by `by_email`, then ONE
 * `db/shop_write:upsertShop` whose `collaborators` list syncs the `shopCollaborators` join the
 * shell's `Shop.findByCollaborator` reads). Idempotent end-to-end: the canonical seed heals
 * partial corpora, the user upsert is probe-then-create, and the collaborator sync is a
 * delete-diff.
 *
 * @param env - The environment to read configuration from.
 * @param deps - The transport surface (injectable for unit tests).
 * @returns The operator's Convex `users` document id.
 * @throws {MissingEnvironmentVariableError} When `CONVEX_URL`/`NEXT_PUBLIC_CONVEX_URL` or
 *   `CONVEX_SERVER_SECRET` is unset — run via `pnpm test:e2e` so root `.env.local` loads.
 * @throws {UnknownShopDomainError} When the demo shop cannot be resolved after seeding.
 * @throws {NotFoundError} When the keyed shop row vanishes between the resolve and the write.
 */
export async function seedE2eOperator(
    env: NodeJS.ProcessEnv = process.env,
    deps: GlobalSetupDeps = defaultDeps,
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
    await deps.convex.seed(url);

    const client = deps.convex.createClient(url);
    const domain = env.E2E_SHOP_DOMAIN ?? 'nordcom-demo-shop.com';
    const view = (await client.query(shopByDomainRef, { serverSecret, domain })) as ShopByDomainView;
    if (!view) {
        throw new UnknownShopDomainError(domain, 'The demo shop is missing after the canonical Convex seed.');
    }

    const existing = (await client.query(userByEmailRef, { serverSecret, email: TEST_EMAIL })) as UserView | null;
    const user =
        existing ??
        ((await client.mutation(userCreateRef, {
            serverSecret,
            email: TEST_EMAIL,
            name: 'E2E Test User',
            emailVerified: null,
            identities: [],
        })) as UserView);

    const written = (await client.mutation(upsertShopRef, {
        serverSecret,
        legacyId: view.shop.legacyId,
        shop: {},
        collaborators: [{ user: user._id, permissions: ['admin'] }],
    })) as ShopWriteView;
    if (!written) {
        throw new NotFoundError(`canonical shop (legacyId=${view.shop.legacyId})`);
    }

    return user._id;
}

/**
 * Playwright globalSetup.
 *
 * The Convex-native operator seed ({@link seedE2eOperator}) is intact, but the pre-auth session is
 * NOT yet wired: the NextAuth offline cookie-signing this used to do is gone with the dependency, and
 * the Clerk replacement (`@clerk/testing` `clerkSetup()` + `clerk.signIn()` → saved storage state) is
 * the FULL e2e harness rewrite tracked separately. Until then this throws if invoked, so an e2e run
 * fails loud with a pointer rather than silently launching unauthenticated.
 *
 * @returns Never resolves — always throws until Task 8.1 lands.
 * @throws {TodoError} Always, pending the `@clerk/testing` e2e auth wiring.
 */
export default async function globalSetup(): Promise<void> {
    // TODO(Task 8.1): Clerk e2e auth via @clerk/testing — `await clerkSetup()`, ensure the Clerk test
    // user + org + membership, seed the matching Convex rows (extend `seedE2eOperator`), then
    // `await clerk.signIn({ page, emailAddress })` and save the storage state to STORAGE_STATE_PATH.
    throw new TodoError('admin e2e Clerk auth (the NextAuth pre-auth cookie was removed in the Clerk migration)');
}

/**
 * Playwright globalTeardown: no-op. The Convex deployment under test is owned by its launcher,
 * never by this file.
 *
 * @returns Immediately.
 */
export async function globalTeardown(): Promise<void> {}

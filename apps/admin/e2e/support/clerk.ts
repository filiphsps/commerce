import { setupClerkTestingToken } from '@clerk/testing/playwright';
import type { Page } from '@playwright/test';

/**
 * The reserved Clerk e2e operator email. The `+clerk_test` subaddress puts Clerk into test mode for
 * this identity (email-code `424242`, no real delivery); the dev instance has
 * `block_email_subaddresses: false` so the subaddress is accepted. This is the user the global setup
 * provisions in Clerk + Convex and signs in once to produce the shared storage state.
 */
export const E2E_OPERATOR_EMAIL = 'e2e-test+clerk_test@example.com';

/**
 * A SECOND reserved Clerk test email, used by the onboarding spec to drive a FRESH operator with no
 * org through the create-organization step without disturbing the primary operator's seeded tenant.
 */
export const E2E_FRESH_OPERATOR_EMAIL = 'e2e-onboarding+clerk_test@example.com';

/**
 * The canonical e2e shop hostname the seeded org owns. Mirrors `E2E_SHOP_DOMAIN`
 * (`playwright.config.ts` defaults it to the same value); read here so specs and the harness share one
 * source for the routed `/[domain]/` segment.
 */
export const E2E_SHOP_DOMAIN = process.env.E2E_SHOP_DOMAIN ?? 'nordcom-demo-shop.com';

/**
 * Stamps a unique, monotonic run token for a spec so any state it creates (e.g. a Clerk org the
 * onboarding flow makes) is namespaced and trivially identifiable for cleanup — the rerun-safety
 * contract the harness owes the shared deployment.
 *
 * @param prefix - A short, spec-scoped label prepended to the token.
 * @returns A token like `onboarding-1718539200000-7f3a`.
 */
export function runToken(prefix: string): string {
    const random = Math.random().toString(16).slice(2, 6);
    return `${prefix}-${Date.now()}-${random}`;
}

/**
 * Injects Clerk's Testing Token into a page so the request bypasses Clerk's bot-detection / single
 * session-token interstitials. Every spec calls this BEFORE its first navigation, per the
 * `@clerk/testing` contract; the token itself is fetched once in the global setup via `clerkSetup()`.
 *
 * @param page - The Playwright page to arm with the testing token.
 * @returns Resolves once the token is wired onto the page's request context.
 */
export async function armClerkTestingToken(page: Page): Promise<void> {
    await setupClerkTestingToken({ page });
}

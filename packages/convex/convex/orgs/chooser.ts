import { ConvexError } from 'convex/values';

import { clerkQuery } from '../_constructors';
import type { Doc } from '../_generated/dataModel';
import { AuthErrorCode, resolveUserFromIdentity } from '../lib/auth';

/**
 * One shop entry in the chooser payload — exactly the fields the bespoke org×storefront chooser
 * renders into a Nordstar shop card (`name` for the title + avatar initial, `domain` for the
 * `/[domain]/` link and subtitle). Secrets and flags are deliberately absent: the chooser only
 * navigates, it never reads tenant data.
 */
export interface ChooserShop {
    name: string;
    domain: string;
}

/**
 * One org group in the chooser payload: the org's display identity plus the shops it owns that the
 * operator can open. `clerkOrgId` is the active-org key the UI hands to `setActive` /
 * `OrganizationSwitcher`; `name`/`imageUrl` come from the synced `orgs` mirror.
 */
export interface ChooserOrg {
    clerkOrgId: string;
    name: string;
    imageUrl: string | null;
    shops: ChooserShop[];
}

/**
 * Projects a synced `orgs` row + the shops it owns into a {@link ChooserOrg}, sorting shops by name
 * for a stable, alphabetical card order independent of insertion time.
 *
 * @param org - The org mirror row (may be absent when the membership outruns the org webhook).
 * @param clerkOrgId - The Clerk org id keying both the membership and the shop ownership.
 * @param shops - The shop rows owned by this org (`shops.by_clerk_org`).
 * @returns The chooser group; falls back to the org id as the display name when the mirror lags.
 */
function toChooserOrg(org: Doc<'orgs'> | null, clerkOrgId: string, shops: Doc<'shops'>[]): ChooserOrg {
    return {
        clerkOrgId,
        // The membership webhook can land before the org webhook; degrade to the id rather than drop
        // the group, so the operator still sees (and can open) the org's shops.
        name: org?.name ?? clerkOrgId,
        imageUrl: org?.imageUrl ?? null,
        shops: shops
            .map((shop) => ({ name: shop.name, domain: shop.domain }))
            .sort((a, b) => a.name.localeCompare(b.name)),
    };
}

/**
 * The operator's cross-org storefront chooser read behind `orgs/chooser:listForOperator`.
 *
 * Lists EVERY Clerk org the current operator belongs to (via the `orgMemberships.by_user` mirror,
 * keyed on the operator's own `users` row), each with the shops that org owns (`shops.by_clerk_org`),
 * for the bespoke org×storefront chooser. The operator is derived entirely from the validated Clerk
 * identity ({@link clerkQuery} + {@link resolveUserFromIdentity}) — never a client argument — so the
 * read can only ever return the caller's OWN orgs and can never leak another operator's tenancy.
 *
 * Orgs are sorted by display name; an org whose mirror row hasn't synced yet still appears (named by
 * its id) so its shops stay reachable during the webhook sync window. Returns `[]` for an operator
 * with no org memberships (the chooser renders its empty state).
 *
 * A brand-new operator whose `users` row has not been provisioned yet — the Clerk `user.created`
 * webhook and the lazy `ensureCurrentUser` safety net have not landed at first paint — would make
 * {@link resolveUserFromIdentity} throw `UNKNOWN_USER`. That is the EXPECTED first-load state, not an
 * error: this query swallows it and returns `[]` so the chooser shows the "create organization" empty
 * state instead of crashing. The identity itself is still validated (a `FORGED_IDENTITY` /
 * `UNAUTHENTICATED` / `IDENTITY_WITHOUT_EMAIL` failure still propagates) — only the missing-row case
 * is treated as "no orgs yet".
 *
 * @returns The operator's orgs, each with its owned shops, alphabetized by org then shop name; `[]`
 *   when the operator has no orgs or no provisioned `users` row yet.
 * @throws {ConvexError} `UNAUTHENTICATED` / `FORGED_IDENTITY` / `IDENTITY_WITHOUT_EMAIL` from the
 *   Clerk identity validation.
 */
export const listForOperator = clerkQuery({
    args: {},
    handler: async (ctx): Promise<ChooserOrg[]> => {
        let operator: Doc<'users'>;
        try {
            operator = await resolveUserFromIdentity(ctx);
        } catch (error) {
            // An un-provisioned operator (webhook / ensureCurrentUser not landed) has no orgs to show
            // yet; surface the empty state rather than erroring the chooser page. Re-throw every other
            // failure — a forged/unauthenticated identity must NOT be masked as "no orgs".
            if (error instanceof ConvexError && error.data?.code === AuthErrorCode.UNKNOWN_USER) {
                return [];
            }
            throw error;
        }

        const memberships = await ctx.db
            .query('orgMemberships')
            .withIndex('by_user', (q) => q.eq('user', operator._id))
            .collect();

        const groups: ChooserOrg[] = [];
        for (const membership of memberships) {
            const { clerkOrgId } = membership;
            const org = await ctx.db
                .query('orgs')
                .withIndex('by_clerk_org', (q) => q.eq('clerkOrgId', clerkOrgId))
                .first();
            const shops = await ctx.db
                .query('shops')
                .withIndex('by_clerk_org', (q) => q.eq('clerkOrgId', clerkOrgId))
                .collect();
            groups.push(toChooserOrg(org, clerkOrgId, shops));
        }

        return groups.sort((a, b) => a.name.localeCompare(b.name));
    },
});

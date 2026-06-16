import 'server-only';

import { convexIdentityQuery } from '@nordcom/commerce-db';

import { getAuthenticatedConvexClient } from './clerk-convex-token';

/**
 * One storefront the operator can open from the chooser — the wire shape of a `ChooserShop` row from
 * `orgs/chooser:listForOperator`.
 */
export interface ChooserShop {
    name: string;
    domain: string;
}

/**
 * One org group in the chooser — the wire shape of a `ChooserOrg` row from
 * `orgs/chooser:listForOperator`: the org identity plus the shops it owns.
 */
export interface ChooserOrg {
    clerkOrgId: string;
    name: string;
    imageUrl: string | null;
    shops: ChooserShop[];
}

/**
 * Lists every Clerk org the current operator belongs to, each with the storefronts that org owns, for
 * the bespoke org×storefront chooser. Runs on a fresh Clerk-authenticated Convex client so the read is
 * scoped to the operator's own identity — the Convex `clerkQuery` derives the operator from the
 * validated token, never a client argument, so it can never surface another operator's orgs.
 *
 * @returns The operator's orgs, each with its owned shops, alphabetized by org then shop name.
 * @throws {ConvexOperatorTokenMintError} When there is no authenticated Clerk operator or no
 *   `convex`-template token can be issued.
 */
export async function getChooserOrgs(): Promise<ChooserOrg[]> {
    const client = await getAuthenticatedConvexClient();
    return convexIdentityQuery<ChooserOrg[]>(client, 'orgs/chooser:listForOperator', {});
}

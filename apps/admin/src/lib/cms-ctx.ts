import 'server-only';

import { auth, currentUser } from '@clerk/nextjs/server';
import type { OnlineShop, UserBase } from '@nordcom/commerce-db';
import { Shop, User } from '@nordcom/commerce-db';
import { Error as CommerceError } from '@nordcom/commerce-errors';
import type { Route } from 'next';
import { notFound, redirect } from 'next/navigation';

import { setActiveShopDomain } from './active-shop';

/**
 * Bundled per-request context for the co-located CMS routes:
 *
 * - `user`: the platform `users` document the Clerk operator's email maps to, projected to the
 *   editor seam's principal shape. `role` derives from the `shopCollaborators` join (an `'admin'`
 *   permission on any collaboration), the same provenance Convex's `resolveShopAccess` enforces
 *   server-side; `tenants` lists the shop ids the user collaborates on.
 * - `tenant`: resolved from `domain` via `Shop.findByDomain` (shop == tenant post-unification).
 *   `null` only when `domain` was omitted (admin routes that operate cross-tenant).
 *
 * This context only GATES routes (redirect/notFound + the manifests' UI access predicates); every
 * write and shell read re-enforces access inside Convex from the operator's validated Clerk identity.
 */
export type AuthedCmsCtx = {
    user: {
        id: string;
        email: string;
        name: string;
        role: 'admin' | 'editor';
        tenants: Array<{ tenant: string }>;
        collection: 'users';
    };
    tenant: {
        id: string;
        slug: string;
        name: string;
        defaultLocale: string;
        locales: string[];
    } | null;
};

/**
 * Whether the user holds the `admin` permission on the given collaborated shop.
 *
 * @param shop - A shop returned by `Shop.findByCollaborator` (carries the join rows).
 * @param userId - The platform user id to match against the join's `user` ref.
 * @returns `true` when an `admin`-permission collaborator row exists for the user.
 */
function hasAdminPermission(shop: OnlineShop, userId: string): boolean {
    return (shop.collaborators ?? []).some(
        (collaborator) => collaborator.user === userId && (collaborator.permissions ?? []).includes('admin'),
    );
}

/**
 * Authenticates the current Clerk session and resolves the platform user and tenant context.
 *
 * Redirects to /auth/sign-in/ when no valid Clerk session, no operator email, or no platform user
 * exists. Calls notFound() when the domain resolves to an unknown shop, or when an editor accesses a
 * tenant they are not a collaborator on (admins are not gated — cross-tenant operator access by
 * design, matching the manifests' `adminOnly`/`tenantMember` short-circuits).
 *
 * The operator's email comes from Clerk (`currentUser().primaryEmailAddress`), the same email the
 * `convex` JWT template carries, so this app-layer principal stays aligned with the identity Convex
 * resolves server-side.
 *
 * @param domain - Tenant domain for the request; omit on admin-only cross-tenant routes.
 * @returns A bundle of the projected user principal and the resolved tenant (null when domain is omitted).
 */
export async function getAuthedCmsCtx(domain?: string): Promise<AuthedCmsCtx> {
    // Pin the routed domain into the request-scoped slot BEFORE any tenant Convex call: the editor
    // bridge's tenant-call wrappers inject it as `shopDomain`, the selector Convex's `resolveShopAccess`
    // authorizes. A cross-tenant admin route (no `domain`) leaves it unset, so those calls keep falling
    // back to the lone-membership resolution.
    setActiveShopDomain(domain);

    const { userId } = await auth();
    if (!userId) {
        redirect('/auth/sign-in/' as Route);
    }

    const operator = await currentUser();
    const email = operator?.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
    if (!email) {
        redirect('/auth/sign-in/' as Route);
    }

    let userDoc: UserBase;
    try {
        userDoc = await User.find({ filter: { email }, count: 1 });
    } catch (err) {
        if (CommerceError.isNotFound(err)) {
            // Signed into Clerk but no platform user exists yet (the webhook/lazy provisioning has
            // not landed). Punt to sign-in so the operator sees the failure instead of silently
            // provisioning a collaborator-less account on every request.
            redirect('/auth/sign-in/' as Route);
        }
        throw err;
    }

    const platformUserId = String(userDoc.id);
    const collaborations = await Shop.findByCollaborator({ collaboratorId: platformUserId });
    const role: 'admin' | 'editor' = collaborations.some((shop) => hasAdminPermission(shop, platformUserId))
        ? 'admin'
        : 'editor';

    let tenant: AuthedCmsCtx['tenant'] = null;
    if (domain) {
        let shop: OnlineShop;
        try {
            shop = (await Shop.findByDomain(domain)) as OnlineShop;
        } catch (err) {
            if (CommerceError.isNotFound(err)) notFound();
            throw err;
        }
        const rawDefaultLocale = shop.i18n?.defaultLocale;
        const tenantDefaultLocale = rawDefaultLocale && rawDefaultLocale.length > 0 ? rawDefaultLocale : 'en-US';
        tenant = {
            id: String(shop.id),
            slug: String(shop.id),
            name: shop.name || domain,
            defaultLocale: tenantDefaultLocale,
            locales: [tenantDefaultLocale],
        };

        if (role !== 'admin' && !collaborations.some((collaborated) => String(collaborated.id) === tenant?.id)) {
            // Editors must explicitly collaborate on the resolved tenant. Without this check an
            // editor with access to shop A could navigate to shop B's domain and the `user.tenants`
            // list below would never gate them at the route level. Admins are NOT gated here —
            // matching `tenantMember`'s early-return-true for the admin role.
            notFound();
        }
    }

    return {
        user: {
            id: platformUserId,
            email: userDoc.email,
            name: userDoc.name,
            role,
            tenants: collaborations.map((collaborated) => ({ tenant: String(collaborated.id) })),
            collection: 'users',
        },
        tenant,
    };
}

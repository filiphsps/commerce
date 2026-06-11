import 'server-only';

import type { OnlineShop, UserBase } from '@nordcom/commerce-db';
import { Shop, User } from '@nordcom/commerce-db';
import { Error as CommerceError } from '@nordcom/commerce-errors';
import type { Route } from 'next';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { setActiveShopSelection } from './active-shop';

/**
 * The NextAuth session shape the authed context narrows to. `auth()` is
 * NextAuth's overloaded helper — its return type union includes the
 * middleware-wrapper form, so `ReturnType<typeof auth>` widens beyond the
 * no-args call's session shape; this is what we actually receive.
 */
export type AuthedSession = {
    user: { email?: string | null; name?: string | null; image?: string | null; id?: string };
    expires: string;
};

/**
 * Bundled per-request context for the co-located CMS routes:
 *
 * - `session`: the NextAuth session — guaranteed non-null after this call.
 * - `user`: the platform `users` document the NextAuth email maps to,
 *   projected to the editor seam's principal shape. `role` derives from the
 *   `shopCollaborators` join (an `'admin'` permission on any collaboration),
 *   the same provenance Convex's `resolveAdminShopId` enforces server-side;
 *   `tenants` lists the shop ids the user collaborates on.
 * - `tenant`: resolved from `domain` via `Shop.findByDomain` (shop == tenant
 *   post-unification). `null` only when `domain` was omitted (admin routes
 *   that operate cross-tenant).
 *
 * This context only GATES routes (redirect/notFound + the manifests' UI access
 * predicates); every write and shell read re-enforces access inside Convex
 * from the operator's validated identity.
 */
export type AuthedCmsCtx = {
    session: AuthedSession;
    user: {
        id: string;
        email: string;
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
 * Authenticates the current NextAuth session and resolves the platform user and tenant context.
 *
 * Redirects to /auth/login/ when no valid session or platform user exists.
 * Calls notFound() when the domain resolves to an unknown shop, or when an
 * editor accesses a tenant they are not a collaborator on (admins are not
 * gated — cross-tenant operator access by design, matching the manifests'
 * `adminOnly`/`tenantMember` short-circuits).
 *
 * @param domain - Tenant domain for the request; omit on admin-only cross-tenant routes.
 * @returns A bundle of the session, the projected user principal, and the resolved tenant (null when domain is omitted).
 */
export async function getAuthedCmsCtx(domain?: string): Promise<AuthedCmsCtx> {
    const session = await auth();
    if (!session?.user?.email) {
        redirect('/auth/login/' as Route);
    }
    const email = session.user.email;

    let userDoc: UserBase;
    try {
        userDoc = await User.find({ filter: { email }, count: 1 });
    } catch (err) {
        if (CommerceError.isNotFound(err)) {
            // Logged into NextAuth but no platform user exists yet. Punt to
            // login so the operator sees the failure instead of silently
            // provisioning a collaborator-less account on every request.
            redirect('/auth/login/' as Route);
        }
        throw err;
    }

    const userId = String(userDoc.id);
    const collaborations = await Shop.findByCollaborator({ collaboratorId: userId });
    const role: 'admin' | 'editor' = collaborations.some((shop) => hasAdminPermission(shop, userId))
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
            // Editors must explicitly collaborate on the resolved tenant.
            // Without this check an editor with access to shop A could
            // navigate to shop B's domain and the `user.tenants` list below
            // would never gate them at the route level. Admins are NOT gated
            // here — matching `tenantMember`'s early-return-true for the
            // admin role.
            notFound();
        }
    }

    // Record the route's tenant as the request's active-shop selection so the per-call Convex
    // token mint can stamp it as the active-shop claim — what disambiguates a multi-shop operator
    // server-side. Cross-tenant routes (no domain) record no selection, keeping the claim-less
    // single-membership fallback.
    setActiveShopSelection(tenant?.id);

    return {
        session: session as AuthedSession,
        user: {
            id: userId,
            email: userDoc.email,
            role,
            tenants: collaborations.map((collaborated) => ({ tenant: String(collaborated.id) })),
            collection: 'users',
        },
        tenant,
    };
}

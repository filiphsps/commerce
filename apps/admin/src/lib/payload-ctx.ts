import 'server-only';

import { Shop } from '@nordcom/commerce-db';
import { Error as CommerceError } from '@nordcom/commerce-errors';
import type { Route } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getPayload, type Payload } from 'payload';
import { auth } from '@/auth';
import payloadConfig from '@/payload.config';

/**
 * Bundled per-request context for the co-located CMS routes:
 *
 * - `payload`: the booted Payload instance (cached after first call).
 * - `session`: the NextAuth session — guaranteed non-null after this call.
 * - `user`: the Payload `users` document the NextAuth email maps to, plus
 *   `tenants` populated from the resolved tenant, plus the `collection`
 *   field Payload's access predicates expect. Pass this verbatim to every
 *   `payload.local` call as `user: ...` so access checks see the same
 *   principal that gated the route.
 * - `tenant`: resolved from `domain` via `Shop.findByDomain` → tenant
 *   lookup by `shopId`. `null` only when `domain` was omitted (admin
 *   routes that operate cross-tenant).
 *
 * Replaces the NextAuth → Payload bridge that lived in
 * `packages/cms/src/auth/nextauth-strategy.ts`. That bridge did the same
 * email → user lookup but ran inside Payload's `AuthStrategy.authenticate`
 * pipeline against a JWE cookie — three independent failure modes
 * (cookie naming, JWE decryption, silent null on Mongo flake) all rendered
 * as "user looks logged in but Payload renders Unauthorized." Doing the
 * lookup explicitly here trades one failure-mode-per-bridge-step for one
 * server-component-throw-per-real-problem.
 */
// `auth()` is NextAuth's overloaded helper — its return type union includes
// the middleware-wrapper form, so `ReturnType<typeof auth>` widens to
// something Payload doesn't want. Narrow to the session shape we actually
// receive when `auth()` is called with no args.
export type AuthedSession = {
    user: { email?: string | null; name?: string | null; image?: string | null; id?: string };
    expires: string;
};

export type AuthedPayloadCtx = {
    payload: Payload;
    session: AuthedSession;
    user: {
        id: string;
        email: string;
        role: 'admin' | 'editor';
        tenants: Array<{ tenant: string }>;
        collection: 'users';
    };
    tenant: { id: string; slug: string; name: string } | null;
};

export async function getAuthedPayloadCtx(domain?: string): Promise<AuthedPayloadCtx> {
    const session = await auth();
    if (!session?.user?.email) {
        redirect('/auth/login/' as Route);
    }
    const payload = await getPayload({ config: payloadConfig });

    const email = session.user.email;
    const { docs: userDocs } = await payload.find({
        collection: 'users',
        where: { email: { equals: email } },
        limit: 1,
        overrideAccess: true,
    });
    const userDoc = userDocs[0];
    if (!userDoc) {
        // Logged into NextAuth but no Payload user exists yet. The bridge
        // used to auto-provision here; we punt to login so the operator
        // sees the failure instead of silently provisioning a no-tenant
        // editor account on every request.
        redirect('/auth/login/' as Route);
    }

    let tenant: AuthedPayloadCtx['tenant'] = null;
    if (domain) {
        let shop: { id: string };
        try {
            shop = (await Shop.findByDomain(domain)) as { id: string };
        } catch (err) {
            if (CommerceError.isNotFound(err)) notFound();
            throw err;
        }
        const { docs: tenantDocs } = await payload.find({
            collection: 'tenants',
            where: { shopId: { equals: shop.id } },
            limit: 1,
            overrideAccess: true,
        });
        const tenantDoc = tenantDocs[0];
        if (!tenantDoc) {
            // Shop exists but tenant mirror doesn't. `attachShopSync` should
            // have created it on Shop save; if we're here the post-save
            // hook silently dropped the create. Treat as not-found rather
            // than rendering a broken edit form.
            notFound();
        }
        tenant = {
            id: String(tenantDoc.id),
            slug: String(tenantDoc.slug ?? shop.id),
            name: String(tenantDoc.name ?? domain),
        };
    }

    return {
        payload,
        session: session as AuthedSession,
        user: {
            id: String(userDoc.id),
            email: userDoc.email as string,
            role: ((userDoc.role as string) === 'admin' ? 'admin' : 'editor') as 'admin' | 'editor',
            tenants: tenant ? [{ tenant: tenant.id }] : [],
            collection: 'users',
        },
        tenant,
    };
}

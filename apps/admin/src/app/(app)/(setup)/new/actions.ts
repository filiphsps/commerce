'use server';

import 'server-only';

import { Shop } from '@nordcom/commerce-db';
import { Error as CommerceError } from '@nordcom/commerce-errors';
import type { Route } from 'next';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { PROVIDER_MAPPERS } from '@/lib/commerce-providers/mappers';
import { DEFAULT_SHOP_ACCENTS, DEFAULT_SHOP_LOCALE, DEFAULT_SHOP_LOGO } from '@/lib/new-shop/defaults';
import type { CreateShopInput, CreateShopResult } from '@/lib/new-shop/types';
import { isValidHostname, isValidLocale, normalizeHostname, readableForeground } from '@/lib/new-shop/validation';

/**
 * Live availability check for a prospective customer-facing domain. A free domain makes
 * `Shop.findByDomain` throw a not-found error; a claimed one resolves a shop. Invalid hostnames short
 * out as unavailable without touching the seam.
 *
 * @param domain - Raw hostname text from the Basics step.
 * @returns `{ available }` — `true` only when the normalized hostname is valid and unclaimed.
 * @throws Re-throws any non-not-found error from the seam (e.g. a transport failure) so it is not
 *   silently reported as "available".
 */
export async function checkDomainAvailability(domain: string): Promise<{ available: boolean }> {
    const normalized = normalizeHostname(domain);
    if (!isValidHostname(normalized)) {
        return { available: false };
    }
    try {
        await Shop.findByDomain(normalized);
        return { available: false };
    } catch (error) {
        if (CommerceError.isNotFound(error)) {
            return { available: true };
        }
        throw error;
    }
}

/**
 * Creates a new shop from the wizard payload in one atomic `Shop.create` (→ `db/shop_write:upsertShop`)
 * transaction: the shop row, the shredded secret credentials, the `shopDomains` routing row, and the
 * creator's `['admin']` collaborator membership. On success it revalidates the shop overview and
 * redirects to the new shop's Domain settings screen so the operator can connect DNS; on a seam
 * failure it returns the error for the review step to show.
 *
 * @param input - The collected name, domain, locale, provider connection, and optional branding.
 * @returns `{ ok: false, error }` on failure; never resolves on success (it redirects).
 */
export async function createShop(input: CreateShopInput): Promise<CreateShopResult> {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
        return { ok: false, error: 'You must be signed in to create a shop.' };
    }

    const mapper = PROVIDER_MAPPERS[input.provider.type];
    if (!mapper) {
        return { ok: false, error: `Unsupported commerce provider: ${input.provider.type}` };
    }

    // Defense in depth: the connect step already gates on a non-empty private token, but a shop with an
    // empty secret `authentication.token` is structurally valid yet functionally broken (storefront calls
    // need it). Re-check here so a bypassed/edited client can never persist one.
    const commerceProvider = mapper(input.provider.values);
    if (commerceProvider.type === 'shopify' && !commerceProvider.authentication.token) {
        return { ok: false, error: 'A private Storefront access token is required.' };
    }

    const name = input.name.trim();
    const domain = normalizeHostname(input.domain);
    // Defense in depth: the client picks from a fixed valid-locale select, but a bypassed client could
    // submit a malformed tag. An invalid `defaultLocale` would corrupt the `request → shop default →
    // platform default` resolution, so fall back to the platform default rather than persist garbage.
    const locale = isValidLocale(input.locale) ? input.locale.trim() : DEFAULT_SHOP_LOCALE;

    // Defense in depth, mirroring the token guard above: the Convex insert accepts empty strings, so an
    // empty name or a non-routable domain from a bypassed/edited client would persist a broken, unroutable
    // shop. Re-validate both here so only a well-formed identity is created.
    if (!name) {
        return { ok: false, error: 'A shop name is required.' };
    }
    if (!isValidHostname(domain)) {
        return { ok: false, error: 'Enter a valid customer-facing domain.' };
    }

    // Defense in depth: re-check availability server-side for a fast, friendly rejection. `upsertShop`
    // now also rejects a contested PRIMARY domain transactionally (`SHOP_WRITE_PRIMARY_DOMAIN_TAKEN`,
    // rolls back — no orphan shop), so this pre-check is the friendly path and that invariant is the
    // race backstop. The client gates on this too, but a bypassed or raced client still hits one guard.
    let domainAvailable: boolean;
    try {
        ({ available: domainAvailable } = await checkDomainAvailability(domain));
    } catch {
        return { ok: false, error: 'Could not verify the domain — please try again.' };
    }
    if (!domainAvailable) {
        return { ok: false, error: 'That domain is already in use.' };
    }

    const accents = input.branding
        ? [
              {
                  type: 'primary' as const,
                  color: input.branding.primaryColor,
                  foreground: readableForeground(input.branding.primaryColor),
              },
              {
                  type: 'secondary' as const,
                  color: input.branding.secondaryColor,
                  foreground: readableForeground(input.branding.secondaryColor),
              },
          ]
        : DEFAULT_SHOP_ACCENTS;

    let createdDomain: string;
    try {
        const shop = await Shop.create({
            name,
            domain,
            i18n: { defaultLocale: locale },
            design: {
                header: { logo: { ...DEFAULT_SHOP_LOGO, alt: `${name} logo` } },
                accents,
            },
            commerceProvider,
            collaborators: [{ user: userId, permissions: ['admin'] }],
        });
        createdDomain = shop.domain;
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : 'Failed to create the shop.' };
    }

    revalidatePath('/');
    redirect(`/${createdDomain}/settings/domain/` as Route);
}

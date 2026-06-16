import { v } from 'convex/values';

import type { Doc, Id } from '../_generated/dataModel';
import { tenantMutation, tenantQuery } from '../lib/tenant';
import { resolveMediaForRead } from './media';

/**
 * The unified Shop settings surface (UNIFY-SHOP). The admin's `shops` editor used to write a
 * disconnected `cmsDocuments` singleton the storefront never read; these tenant functions instead
 * read and write the REAL `shops` row the storefront resolves through `Shop.findByDomain`, so a
 * single surface owns brand identity, default locale, primary domain, business data, and brand
 * assets. The former standalone `businessData` CMS collection is folded into the same surface.
 *
 * The editor stores brand assets as picked `cmsMedia` ids; this module resolves them to the
 * `{ src, alt, width, height }` image-asset shape the storefront already renders (`design.header.logo`,
 * `icons.favicon`), recording the source media id under `branding` so the picker can re-show the
 * current selection.
 */

/** The resolved image-asset shape stored on the shop row for the logo/favicon. */
type ImageAsset = { width: number; height: number; src: string; alt: string };

/** The editor-facing document the unified Shop settings surface renders and writes back. */
type ShopConfigDocument = {
    name: string;
    description: string;
    primaryDomain: string;
    i18n: { defaultLocale: string };
    logo: string;
    favicon: string;
    businessData: NonNullable<Doc<'shops'>['businessData']>;
    design: { accents: Doc<'shops'>['design']['accents'] };
};

/**
 * The mutation-context slice {@link resolveAsset} needs: the RLS-wrapped reader plus the storage
 * binding, the same shape `resolveMediaForRead` consumes.
 */
type AssetResolutionCtx = Parameters<typeof resolveMediaForRead>[0];

/**
 * Resolves a picked `cmsMedia` id to the stored image-asset shape, or `null` when the id is absent,
 * foreign, or unresolvable — leaving the existing asset in place rather than clobbering it.
 *
 * @param ctx - The media-resolution context (RLS reader + storage).
 * @param shopId - The tenant the media must belong to.
 * @param mediaId - The picked media document id, or an empty string when nothing is selected.
 * @returns The resolved asset, or `null`.
 */
async function resolveAsset(ctx: AssetResolutionCtx, shopId: Id<'shops'>, mediaId: string): Promise<ImageAsset | null> {
    if (mediaId.length === 0) return null;
    const media = await resolveMediaForRead(ctx, shopId, mediaId);
    if (media === null) return null;
    if (!media.url) return null;
    return { src: media.url, alt: media.alt ?? '', width: media.width ?? 512, height: media.height ?? 512 };
}

/**
 * Reads the active tenant's shop row and projects it onto the editor document the unified Shop
 * settings surface renders.
 *
 * @returns The editor-facing shop configuration document.
 * @throws {ConvexError} Any tenant-resolution failure from the `tenantQuery` constructor.
 */
export const get = tenantQuery({
    args: {},
    handler: async (ctx): Promise<ShopConfigDocument | null> => {
        const shop = await ctx.db.get(ctx.shopId);
        if (!shop) return null;
        return {
            name: shop.name,
            description: shop.description ?? '',
            primaryDomain: shop.domain,
            i18n: { defaultLocale: shop.i18n?.defaultLocale ?? 'en-US' },
            logo: shop.branding?.logoMediaId ?? '',
            favicon: shop.branding?.faviconMediaId ?? '',
            businessData: shop.businessData ?? {},
            design: { accents: shop.design.accents },
        };
    },
});

/**
 * Lists the tenant's connected domains — its primary `domain` plus every `alternativeDomains` entry
 * — as the option set the unified editor's primary-domain picker chooses from. Domains are added or
 * removed on the dedicated domains settings surface; this surface only re-elects which connected
 * domain is primary.
 *
 * @returns The connected domains, primary first.
 * @throws {ConvexError} Any tenant-resolution failure from the `tenantQuery` constructor.
 */
export const connectedDomains = tenantQuery({
    args: {},
    handler: async (ctx): Promise<string[]> => {
        const shop = await ctx.db.get(ctx.shopId);
        if (!shop) return [];
        return [shop.domain, ...(shop.alternativeDomains ?? [])];
    },
});

/** The editor payload `save` accepts — the serialized {@link ShopConfigDocument} field map. */
type ShopConfigInput = {
    name?: unknown;
    description?: unknown;
    primaryDomain?: unknown;
    i18n?: { defaultLocale?: unknown } | null;
    logo?: unknown;
    favicon?: unknown;
    businessData?: unknown;
    design?: { accents?: unknown } | null;
};

/**
 * Persists the unified Shop settings surface back onto the real `shops` row, merging field-wise so an
 * omitted field never erases stored data. Re-electing the primary domain reorders the connected set
 * (`domain` + `alternativeDomains`) without claiming or releasing any domain — domain membership is
 * the domains surface's concern — so no routing-row reconciliation is needed. A picked logo/favicon
 * media id is resolved to the stored image-asset the storefront renders, and its source id is
 * recorded under `branding` so the picker re-shows the selection.
 *
 * @param args.data - The serialized editor document.
 * @returns The shop's public id (its `legacyId`).
 * @throws {ConvexError} Any tenant-resolution failure from the `tenantMutation` constructor.
 */
export const save = tenantMutation({
    args: { data: v.any() },
    handler: async (ctx, { data }): Promise<{ documentId: string }> => {
        const input = (typeof data === 'object' && data !== null ? data : {}) as ShopConfigInput;
        const shop = await ctx.db.get(ctx.shopId);
        if (!shop) throw new Error('Shop row not found for the active tenant.');

        const patch: Partial<Doc<'shops'>> = {};

        if (typeof input.name === 'string') patch.name = input.name;
        if (typeof input.description === 'string') patch.description = input.description;

        if (input.i18n && typeof input.i18n.defaultLocale === 'string') {
            patch.i18n = { defaultLocale: input.i18n.defaultLocale };
        }

        // Re-elect the primary domain only among already-connected domains; derive the alternatives
        // from the leftovers so the routing set is preserved exactly.
        if (typeof input.primaryDomain === 'string' && input.primaryDomain.length > 0) {
            const connected = [shop.domain, ...(shop.alternativeDomains ?? [])];
            if (connected.includes(input.primaryDomain)) {
                patch.domain = input.primaryDomain;
                patch.alternativeDomains = connected.filter((domain) => domain !== input.primaryDomain);
            }
        }

        if (input.businessData && typeof input.businessData === 'object') {
            patch.businessData = input.businessData as Doc<'shops'>['businessData'];
        }

        const branding = { ...(shop.branding ?? {}) };
        const designHeaderLogo = await (typeof input.logo === 'string'
            ? resolveAsset(ctx, ctx.shopId, input.logo)
            : Promise.resolve(null));
        if (designHeaderLogo) branding.logoMediaId = input.logo as string;

        const favicon = await (typeof input.favicon === 'string'
            ? resolveAsset(ctx, ctx.shopId, input.favicon)
            : Promise.resolve(null));
        if (favicon) branding.faviconMediaId = input.favicon as string;

        const accents = input.design && Array.isArray(input.design.accents) ? input.design.accents : undefined;
        if (designHeaderLogo || accents) {
            patch.design = {
                header: { logo: designHeaderLogo ?? shop.design.header.logo },
                accents: (accents as Doc<'shops'>['design']['accents']) ?? shop.design.accents,
            };
        }
        if (favicon) patch.icons = { ...(shop.icons ?? {}), favicon };
        if (branding.logoMediaId || branding.faviconMediaId) patch.branding = branding;

        patch.updatedAt = Date.now();
        await ctx.db.patch(ctx.shopId, patch);

        return { documentId: shop.legacyId };
    },
});

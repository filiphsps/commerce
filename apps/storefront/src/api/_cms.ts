import 'server-only';

import type { Media } from '@nordcom/commerce-cms/types';

/**
 * The frozen paginated list envelope the SFREAD-01 contract serves for the
 * `pages`/`articles` list getters. The Payload-era getters returned this exact
 * shape; the Convex reads return docs only, so the getters reconstruct the
 * envelope (a single bounded window in practice) to keep every consumer's
 * contract byte-identical.
 */
export type CmsPaginatedDocs<TDoc> = {
    docs: TDoc[];
    totalDocs: number;
    totalPages: number;
    page: number;
    pagingCounter: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    limit: number;
    nextPage: number | null;
    prevPage: number | null;
};

/**
 * Narrow a CMS upload field (`string | Media | null | undefined`) to a populated
 * `Media` or `null`. Upload relations arrive populated as objects; unset
 * uploads come through as `null`. A bare string id means the relation was not
 * populated for this hop — treat as no data.
 *
 * @param v - Raw CMS upload field value.
 * @returns The populated `Media` object, or `null` when unpopulated or absent.
 */
export const populatedMedia = (v: string | Media | null | undefined): Media | null =>
    v && typeof v !== 'string' ? v : null;

/**
 * Narrow the tenant field (`string | Tenant | null | undefined`) to its id, or null.
 * Used for cache-key purposes and audit logging.
 *
 * @param v - Raw tenant field from a CMS document.
 * @returns The tenant id string, or `null` when absent.
 */
export const tenantId = (v: string | { id: string } | null | undefined): string | null =>
    typeof v === 'string' ? v : (v?.id ?? null);

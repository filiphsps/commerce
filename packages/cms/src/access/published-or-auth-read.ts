import type { Access } from 'payload';

/**
 * Read predicate for tenant-`isGlobal` collections that carry drafts:
 *
 * - Anonymous storefront reads are limited to `_status: 'published'` so an
 *   editor mid-autosave can't leak unfinished content to live visitors.
 * - Logged-in CMS users get the unfiltered read; tenant scoping is enforced
 *   separately by the multi-tenant plugin when the collection is marked
 *   `isGlobal`.
 *
 * Use this in place of `publicRead` for any draft-enabled collection.
 */
export const publishedOrAuthRead: Access = ({ req }) => {
    if (req?.user) return true;
    return { _status: { equals: 'published' } } as never;
};

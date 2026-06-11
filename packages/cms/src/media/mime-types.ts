/**
 * The frozen media mime allowlist: any image, mp4 video, and PDF. Single source of truth for the
 * admin upload action's pre-check; the Convex storage layer
 * (`packages/convex/convex/cms/media.ts`) MIRRORS this list rather than importing it, because the
 * Convex isolate's bundle surface stays free of this package — `mime-drift.test.ts` fails CI when
 * the mirror diverges. Relocated from the deleted Payload `media` collection (TEARDOWN-02).
 */
export const MEDIA_MIME_TYPES = ['image/*', 'video/mp4', 'application/pdf'] as const;

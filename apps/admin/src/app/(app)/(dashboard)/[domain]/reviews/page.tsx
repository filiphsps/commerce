import 'server-only';

import { Review } from '@nordcom/commerce-db';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ContentScrollRegion } from '@/components/shell/content-scroll-region';
import { PageHeader } from '@/components/shell/page-header';
import { getAuthedPayloadCtx } from '@/lib/payload-ctx';

export const metadata: Metadata = { title: 'Reviews' };

type Params = Promise<{ domain: string }>;

/**
 * Tenant reviews listing over the core Convex `reviews` table via the db seam
 * (`Review.findByShop`) — review data never lived in `cmsDocuments`, so the CMS editor shell is
 * the wrong surface for it (CUTOVER-06). The stored review shape is still skeletal (shop ref +
 * timestamps; the content model ships with the reviews redesign), so the listing presents what
 * exists and the authoring UI remains the design-spec'd rework.
 *
 * @param props - Route params carrying the tenant domain.
 * @returns The rendered reviews list.
 */
export default async function ReviewsPage({ params }: { params: Params }) {
    const { domain } = await params;
    const { tenant } = await getAuthedPayloadCtx(domain);
    if (!tenant) {
        notFound();
    }

    // `tenant.slug` carries the PUBLIC shop id (`Shop.findByDomain(...).id`) — the key the
    // `db/reviews:byShop` seam resolves; `tenant.id` is the CMS mirror's document id.
    const reviews = await Review.findByShop(tenant.slug, { count: 100 });

    return (
        <ContentScrollRegion>
            <PageHeader title="Reviews" />
            <div className="flex flex-col gap-4 px-6 py-6">
                <p className="text-muted-foreground text-sm">
                    {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'} for {domain}. Review authoring is
                    being reworked — see the design spec for details.
                </p>
                {reviews.length > 0 && (
                    <ul className="flex flex-col gap-1">
                        {reviews.map((review) => (
                            <li key={review.id} className="flex items-baseline gap-3 text-sm">
                                <span className="truncate font-mono text-muted-foreground text-xs">{review.id}</span>
                                <span>{new Date(review.updatedAt).toLocaleString()}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </ContentScrollRegion>
    );
}

import 'server-only';

import type { Metadata } from 'next';

import { ContentScrollRegion } from '@/components/shell/content-scroll-region';
import { PageHeader } from '@/components/shell/page-header';

export const metadata: Metadata = { title: 'Reviews' };

export default function ReviewsPage() {
    return (
        <ContentScrollRegion>
            <PageHeader title="Reviews" />
            <div className="flex flex-col gap-4 px-6 py-6 text-muted-foreground">
                Reviews UI is being reworked. See the design spec for details.
            </div>
        </ContentScrollRegion>
    );
}

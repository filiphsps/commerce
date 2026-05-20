import 'server-only';

import type { Metadata, Route } from 'next';

import { ContentScrollRegion } from '@/components/shell/content-scroll-region';
import { PageHeader } from '@/components/shell/page-header';

export type ShopNewReviewPageProps = {
    params: Promise<{
        domain: string;
    }>;
};

export const metadata: Metadata = {
    title: 'New Review',
};

export default async function ShopNewReviewPage(_props: ShopNewReviewPageProps) {
    return (
        <ContentScrollRegion>
            <PageHeader
                title="New Review"
                breadcrumbs={[{ label: 'Reviews', href: '../../reviews/' as Route }, { label: 'New' }]}
            />
            <div className="flex flex-col gap-4 px-6 py-6 text-muted-foreground">Review creation form coming soon.</div>
        </ContentScrollRegion>
    );
}

import 'server-only';

import type { Metadata, Route } from 'next';
import { notFound } from 'next/navigation';
import { ContentScrollRegion } from '@/components/shell/content-scroll-region';
import { PageHeader } from '@/components/shell/page-header';
import { createMediaAction } from '@/lib/cms-actions/media-upload';
import { getAuthedCmsCtx } from '@/lib/cms-ctx';
import { UploadForm } from './upload-form';

export const metadata: Metadata = { title: 'Upload Media' };

type Params = Promise<{ domain: string }>;

export default async function UploadMediaPage({ params }: { params: Params }) {
    const { domain } = await params;

    const { user } = await getAuthedCmsCtx(domain);

    // Defense-in-depth: direct URL access by editors returns 404.
    if (user.role !== 'admin') {
        notFound();
    }

    return (
        <ContentScrollRegion>
            <PageHeader
                title="Upload media"
                breadcrumbs={[{ label: 'Media', href: `/${domain}/settings/media/` as Route }, { label: 'Upload' }]}
            />

            <div className="flex flex-col gap-6 px-6 py-8">
                <UploadForm domain={domain} createAction={createMediaAction.bind(null, domain)} />
            </div>
        </ContentScrollRegion>
    );
}
